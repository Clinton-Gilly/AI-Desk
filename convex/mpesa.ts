import { action, mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireOrgMember } from "./lib/auth";
import { api, internal } from "./_generated/api";

// initiateMpesaStkPush action makes external API calls to Safaricom Daraja.
export const initiateMpesaStkPush = action({
  args: {
    phoneNumber: v.string(),
    planSlug: v.string(),
    isAnnual: v.optional(v.boolean()),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate caller (must be workspace admin)
    const authData = await ctx.runQuery(
      api.mpesa.requireAdminForMpesa,
      {}
    );

    const clerkOrgId = authData.orgId;
    const workspaceId = authData.workspaceId;
    if (!clerkOrgId) {
      throw new ConvexError("Must be linked to a Clerk organization to manage billing.");
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

    // Determine amount in KES by querying the database for the dynamic plan
    const plan: any = await ctx.runQuery(api.plans.get, { key: args.planSlug });
    if (!plan) {
      throw new ConvexError("Invalid plan.");
    }
    
    let amount = args.isAnnual && plan.priceYearly ? plan.priceYearly : plan.priceMonthly;
    
    // Apply Coupon
    if (args.couponCode) {
      try {
        const couponResult = await ctx.runQuery(api.coupons.validate, { code: args.couponCode });
        if (couponResult.valid && couponResult.discountPercent) {
          amount = Math.floor(amount * (1 - couponResult.discountPercent / 100));
        } else {
          throw new ConvexError("Coupon code is invalid or expired.");
        }
      } catch (err) {
        throw new ConvexError("Coupon code is invalid or expired.");
      }
    }
    
    if (amount <= 0) {
      throw new ConvexError("Amount after discount is 0 or less. Cannot initiate payment.");
    }

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
      workspaceId,
      clerkOrgId,
      phoneNumber: cleanedPhone,
      amount,
      checkoutRequestID: resBody.CheckoutRequestID,
      merchantRequestID: resBody.MerchantRequestID,
      planSlug: args.planSlug,
      isAnnual: args.isAnnual,
      couponCode: args.couponCode,
    });

    return {
      success: true,
      checkoutRequestID: resBody.CheckoutRequestID,
    };
  },
});

// requireAdminForMpesa parses JWT directly to allow payments before onboarding
export const requireAdminForMpesa = query({
  args: {},
  handler: async (ctx) => {
    const rawIdentity = await ctx.auth.getUserIdentity();
    if (!rawIdentity) {
      throw new ConvexError("Not authenticated.");
    }

    const orgObj = (rawIdentity as any).o;
    const orgId = typeof (rawIdentity as any).org_id === "string" ? (rawIdentity as any).org_id : orgObj?.id || null;
    const orgRole = typeof (rawIdentity as any).org_role === "string" ? (rawIdentity as any).org_role : orgObj?.rol || null;

    if (!orgId) {
      throw new ConvexError("No active organization on the session. Select or create one.");
    }
    
    // Allow either JWT admin role, or if there's a workspace, check workspaceMembers
    let isAdmin = orgRole === "org:admin";
    
    // Check if they are admin in DB (to handle role demotions faster than JWT expiry)
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("clerkOrgId", orgId).eq("clerkUserId", rawIdentity.subject)
      )
      .unique();
      
    if (member && member.status === "active") {
      isAdmin = member.role === "admin";
    }

    if (!isAdmin) {
      throw new ConvexError("Only organization administrators can initiate subscription purchases.");
    }

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_org", (q) => q.eq("clerkOrgId", orgId))
      .unique();

    return { orgId, workspaceId: workspace?._id };
  },
});

// Save new STK push transaction in pending state
export const savePendingMpesaTransaction = internalMutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    clerkOrgId: v.string(),
    phoneNumber: v.string(),
    amount: v.number(),
    checkoutRequestID: v.string(),
    merchantRequestID: v.string(),
    planSlug: v.string(),
    isAnnual: v.optional(v.boolean()),
    couponCode: v.optional(v.string()),
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
      // Mark coupon as used if it exists
      if (tx.couponCode) {
        try {
          await ctx.runMutation(api.coupons.apply, { code: tx.couponCode });
        } catch (e) {
          console.error("Failed to apply coupon:", e);
        }
      }

      await ctx.runMutation(internal.clerkWebhooks.upsertSubscription, {
        clerkOrgId: tx.clerkOrgId,
        subscriptionId: "mpesa_" + tx.checkoutRequestID,
        planSlug: tx.planSlug,
        status: "active",
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + (tx.isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000,
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
