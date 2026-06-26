import { action, mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireOrgMember } from "./lib/auth";
import { api, internal } from "./_generated/api";

// initiateMpesaStkPush action makes external API calls to Safaricom Daraja.
export const initiateMpesaStkPush = action({
  args: {
    phoneNumber: v.string(),
    planSlug: v.union(v.literal("pro"), v.literal("scale")),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate caller (must be workspace admin)
    const { workspace, identity } = await ctx.runQuery(
      api.mpesa.requireAdminForMpesa,
      {}
    );

    const clerkOrgId = workspace.clerkOrgId;
    if (!clerkOrgId) {
      throw new ConvexError("Workspace must be linked to a Clerk organization to manage billing.");
    }

    // Clean phone number (e.g. 0712345678 -> 254712345678)
    let cleanedPhone = args.phoneNumber.replace(/[^0-9]/g, "");
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "254" + cleanedPhone.slice(1);
    } else if (cleanedPhone.startsWith("+")) {
      cleanedPhone = cleanedPhone.slice(1);
    }
    if (!cleanedPhone.startsWith("254")) {
      cleanedPhone = "254" + cleanedPhone;
    }
    if (cleanedPhone.length !== 12) {
      throw new ConvexError("Please provide a valid Safaricom M-Pesa phone number in the format 07XXXXXXXX or 254XXXXXXXX.");
    }

    // Determine amount in KES (Pro is 6500 KES, Scale is 26000 KES)
    const amount = args.planSlug === "pro" ? 6500 : 26000;

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    const mpesaEnv = process.env.MPESA_ENVIRONMENT || "sandbox";

    if (!consumerKey || consumerSecret === undefined || !shortCode || !passkey || !callbackUrl) {
      throw new ConvexError("M-Pesa environment variables are not fully configured on the server.");
    }

    const isProd = mpesaEnv === "production";
    const baseUrl = isProd ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

    // 2. Generate Access Token
    let accessToken = "";
    try {
      const authHeader = btoa(`${consumerKey}:${consumerSecret}`);
      const authRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      });

      if (!authRes.ok) {
        const errorText = await authRes.text();
        throw new Error(`Auth failed: ${errorText}`);
      }

      const authData = (await authRes.json()) as { access_token: string };
      accessToken = authData.access_token;
    } catch (err) {
      console.error("[mpesa] Daraja oauth failed:", err);
      throw new ConvexError("Failed to authenticate with M-Pesa Daraja API. Check credentials.");
    }

    // 3. Initiate STK Push
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14); // YYYYMMDDHHmmss

    const password = btoa(shortCode + passkey + timestamp);

    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: cleanedPhone,
        PartyB: shortCode,
        PhoneNumber: cleanedPhone,
        CallBackURL: callbackUrl,
        AccountReference: `MyChat ${args.planSlug === "pro" ? "Pro" : "Scale"}`,
        TransactionDesc: `MyChat Subscription ${args.planSlug}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[mpesa] Daraja STK request failed:", errorText);
      throw new ConvexError(`M-Pesa STK Push request rejected by Safaricom: ${errorText}`);
    }

    const resBody = (await response.json()) as {
      ResponseCode: string;
      ResponseDescription: string;
      MerchantRequestID: string;
      CheckoutRequestID: string;
    };

    if (resBody.ResponseCode !== "0") {
      throw new ConvexError(`Daraja Error: ${resBody.ResponseDescription}`);
    }

    // 4. Save Pending Transaction
    await ctx.runMutation(internal.mpesa.savePendingMpesaTransaction, {
      workspaceId: workspace._id,
      clerkOrgId,
      phoneNumber: cleanedPhone,
      amount,
      checkoutRequestID: resBody.CheckoutRequestID,
      merchantRequestID: resBody.MerchantRequestID,
      planSlug: args.planSlug,
    });

    return {
      success: true,
      checkoutRequestID: resBody.CheckoutRequestID,
    };
  },
});

// requireAdminForMpesa wraps requireOrgMember for usage inside action
export const requireAdminForMpesa = query({
  args: {},
  handler: async (ctx) => {
    const orgInfo = await requireOrgMember(ctx);
    if (orgInfo.role !== "admin") {
      throw new ConvexError("Only organization administrators can initiate subscription purchases.");
    }
    return orgInfo;
  },
});

// Save new STK push transaction in pending state
export const savePendingMpesaTransaction = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    phoneNumber: v.string(),
    amount: v.number(),
    checkoutRequestID: v.string(),
    merchantRequestID: v.string(),
    planSlug: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("mpesaTransactions", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Update the transaction status on Safaricom callback
export const updateMpesaTransactionStatus = mutation({
  args: {
    checkoutRequestID: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    mpesaReceiptNumber: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("mpesaTransactions")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutRequestID", args.checkoutRequestID))
      .unique();

    if (!tx) {
      console.warn(`[mpesa-callback] No matching transaction found for checkoutRequestID: ${args.checkoutRequestID}`);
      return;
    }

    // Skip if already finalized
    if (tx.status !== "pending") return;

    await ctx.db.patch(tx._id, {
      status: args.status,
      mpesaReceiptNumber: args.mpesaReceiptNumber,
      error: args.error,
      updatedAt: Date.now(),
    });

    // If successful, provision the plan in clerkWebhooks subscription table
    if (args.status === "completed") {
      await ctx.runMutation(internal.clerkWebhooks.upsertSubscription, {
        clerkOrgId: tx.clerkOrgId,
        subscriptionId: "mpesa_" + tx.checkoutRequestID,
        planSlug: tx.planSlug,
        status: "active",
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      console.log(`[mpesa-callback] Successfully upgraded org ${tx.clerkOrgId} to ${tx.planSlug} via M-Pesa receipt ${args.mpesaReceiptNumber}`);
    }
  },
});

// Query to poll status of an active checkout request
export const getActiveMpesaPendingTransaction = query({
  args: { checkoutRequestID: v.string() },
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("mpesaTransactions")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutRequestID", args.checkoutRequestID))
      .unique();
    return tx;
  },
});
