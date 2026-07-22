"use node";
// ─────────────────────────────────────────────────────────────────────────────
// convex/whatsappNode.ts
//
// Node.js action for Meta OAuth code → access token exchange.
// Separated from whatsapp.ts (queries/mutations) because "use node" cannot
// coexist with queries or mutations in the same file.
// ─────────────────────────────────────────────────────────────────────────────

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Meta Graph API response types
type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  error?: { message: string; type: string; code: number };
};

type MetaDebugTokenResponse = {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
  };
  error?: { message: string };
};

type MetaPhoneNumbersResponse = {
  data?: Array<{
    id: string;
    display_phone_number: string;
    verified_name: string;
  }>;
  error?: { message: string };
};

type MetaWABAResponse = {
  id?: string;
  name?: string;
  error?: { message: string };
};

// ── Action: exchange Meta OAuth code → access token → save credentials ────────
//
// Flow:
//   1. Exchange short-lived code → user access token
//   2. Exchange short-lived → long-lived token (60-day)
//   3. debug_token to find granted WABA IDs from granular_scopes
//   4. Fetch phone numbers for the first WABA
//   5. Write to whatsappChannels via internal mutation

export const exchangeCodeAndSave = action({
  args: {
    code: v.string(),
    workspaceId: v.id("workspaces"),
    redirectUri: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { code, workspaceId, redirectUri }) => {
    // Auth check — derive orgId from JWT (never accept it as a parameter)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: "Not authenticated" };

    const claims = identity as unknown as Record<string, unknown>;
    const orgObj = claims.o as Record<string, string> | undefined;
    const clerkOrgId =
      typeof claims.org_id === "string"
        ? claims.org_id
        : (orgObj?.id ?? "");
    if (!clerkOrgId) return { success: false, error: "No active organization" };

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      console.error("[whatsapp] META_APP_ID or META_APP_SECRET not configured");
      return {
        success: false,
        error: "Meta credentials not configured. Set META_APP_ID and META_APP_SECRET via `npx convex env set`.",
      };
    }

    // Mark as pending while exchange is in progress
    await ctx.runMutation(internal.whatsapp.saveCredentials, {
      workspaceId,
      clerkOrgId,
      status: "pending",
    });

    try {
      // ── Step 1: Exchange code → short-lived user token ───────────────────
      const tokenUrl = new URL(
        "https://graph.facebook.com/v20.0/oauth/access_token",
      );
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
      tokenUrl.searchParams.set("code", code);

      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = (await tokenRes.json()) as MetaTokenResponse;

      if (tokenData.error || !tokenData.access_token) {
        const msg = tokenData.error?.message ?? "Token exchange failed (no access_token)";
        console.error("[whatsapp] Step 1 error:", msg);
        await ctx.runMutation(internal.whatsapp.saveCredentials, {
          workspaceId,
          clerkOrgId,
          status: "error",
          errorMessage: msg,
          accessToken: "",
        });
        return { success: false, error: msg };
      }

      const shortToken = tokenData.access_token;

      // ── Step 2: Exchange short-lived → long-lived user token (60 days) ──
      const longTokenUrl = new URL(
        "https://graph.facebook.com/v20.0/oauth/access_token",
      );
      longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
      longTokenUrl.searchParams.set("client_id", appId);
      longTokenUrl.searchParams.set("client_secret", appSecret);
      longTokenUrl.searchParams.set("fb_exchange_token", shortToken);

      const longTokenRes = await fetch(longTokenUrl.toString());
      const longTokenData = (await longTokenRes.json()) as MetaTokenResponse & { expires_in?: number };
      // Fall back to short token if exchange fails (test app scenario)
      const userToken = longTokenData.access_token ?? shortToken;
      // 60 days in ms (Meta returns 5183944 seconds for long-lived tokens)
      const tokenExpiresAt = longTokenData.expires_in
        ? Date.now() + longTokenData.expires_in * 1000
        : Date.now() + 60 * 24 * 60 * 60 * 1000;

      // ── Step 3: Inspect token → find WABA IDs from granular scopes ──────
      const debugUrl = new URL(
        "https://graph.facebook.com/v20.0/debug_token",
      );
      debugUrl.searchParams.set("input_token", userToken);
      debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

      const debugRes = await fetch(debugUrl.toString());
      const debugData = (await debugRes.json()) as MetaDebugTokenResponse;

      const granularScopes = debugData?.data?.granular_scopes ?? [];
      const wabaScope = granularScopes.find(
        (s) =>
          s.scope === "whatsapp_business_management" &&
          s.target_ids &&
          s.target_ids.length > 0,
      );
      const wabaId = wabaScope?.target_ids?.[0];

      let phoneNumberId: string | undefined;
      let phoneNumber: string | undefined;
      let displayName: string | undefined;

      if (wabaId) {
        // ── Step 4a: Fetch phone numbers for this WABA ───────────────────
        const phoneUrl = new URL(
          `https://graph.facebook.com/v20.0/${wabaId}/phone_numbers`,
        );
        phoneUrl.searchParams.set("access_token", userToken);
        phoneUrl.searchParams.set(
          "fields",
          "id,display_phone_number,verified_name",
        );

        const phoneRes = await fetch(phoneUrl.toString());
        const phoneData = (await phoneRes.json()) as MetaPhoneNumbersResponse;

        const firstPhone = phoneData.data?.[0];
        if (firstPhone) {
          phoneNumberId = firstPhone.id;
          phoneNumber = firstPhone.display_phone_number;
          displayName = firstPhone.verified_name;
        }

        // ── Step 4b: Fallback — get display name from WABA itself ────────
        if (!displayName) {
          const wabaUrl = new URL(`https://graph.facebook.com/v20.0/${wabaId}`);
          wabaUrl.searchParams.set("access_token", userToken);
          wabaUrl.searchParams.set("fields", "name");

          const wabaRes = await fetch(wabaUrl.toString());
          const wabaInfo = (await wabaRes.json()) as MetaWABAResponse;
          displayName = wabaInfo.name;
        }
      }

      // ── Step 5: Persist credentials ──────────────────────────────────────
      await ctx.runMutation(internal.whatsapp.saveCredentials, {
        workspaceId,
        clerkOrgId,
        wabaId,
        phoneNumberId,
        phoneNumber,
        displayName,
        accessToken: userToken,
        tokenExpiresAt,
        status: "connected",
      });

      console.log(
        `[whatsapp] Successfully connected WABA ${wabaId ?? "unknown"} for workspace ${workspaceId}`,
      );
      return { success: true };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unknown error during token exchange";
      console.error("[whatsapp] exchangeCodeAndSave error:", err);
      await ctx.runMutation(internal.whatsapp.saveCredentials, {
        workspaceId,
        clerkOrgId,
        status: "error",
        errorMessage: msg,
        accessToken: "",
      });
      return { success: false, error: msg };
    }
  },
});

// ── Internal action: refresh a WhatsApp access token (called by cron) ─────────

import { internalAction } from "./_generated/server";

export const refreshToken = internalAction({
  args: { channelId: v.id("channels") },
  returns: v.null(),
  handler: async (ctx, { channelId }) => {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      console.error("[whatsapp:refresh] META_APP_ID / META_APP_SECRET not set");
      return null;
    }

    // Load current token from DB via an internal query.
    const conn = await ctx.runQuery(internal.channels.getConnectionByPhoneNumberId, {
      // We need the connection by channelId, not phoneNumberId.
      // Use a different lookup path — load the channel, then find the connection.
      phoneNumberId: "__channel_lookup__", // placeholder; real lookup below
    });
    // Workaround: run a mutation to get credentials.
    // Actually use runQuery with a dedicated query.
    const details = await ctx.runQuery(
      internal.dispatcher.getConnectionDetailsForChannel,
      { channelId },
    );
    if (!details || !details.accessToken) {
      console.warn(`[whatsapp:refresh] No token found for channel ${channelId}`);
      return null;
    }

    try {
      const url = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
      url.searchParams.set("grant_type", "fb_exchange_token");
      url.searchParams.set("client_id", appId);
      url.searchParams.set("client_secret", appSecret);
      url.searchParams.set("fb_exchange_token", details.accessToken);

      const res = await fetch(url.toString());
      const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };

      if (data.error || !data.access_token) {
        console.error(`[whatsapp:refresh] Token refresh failed for channel ${channelId}:`, data.error?.message);
        return null;
      }

      const newExpiresAt = data.expires_in
        ? Date.now() + data.expires_in * 1000
        : Date.now() + 60 * 24 * 60 * 60 * 1000;

      await ctx.runMutation(internal.channels.updateToken, {
        channelId,
        accessToken: data.access_token,
        tokenExpiresAt: newExpiresAt,
      });

      console.log(`[whatsapp:refresh] Token refreshed for channel ${channelId}, expires ${new Date(newExpiresAt).toISOString()}`);
    } catch (err) {
      console.error(`[whatsapp:refresh] Error refreshing token for channel ${channelId}:`, err);
    }
    return null;
  },
});

