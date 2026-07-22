import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { Webhook } from "svix";

// ─────────────────────────────────────────────────────────────────────────────
// Single Clerk webhook endpoint (Reconciled-Conflict #8).
//
//   POST  https://<convex-deployment>.convex.site/clerk-webhook
//
// svix-verifies the RAW body against CLERK_WEBHOOK_SIGNING_SECRET, then
// dispatches the parsed event to idempotent internal upserts. Handles:
//   - organization.created / updated / deleted          → workspaces
//   - organizationMembership.created / updated / deleted → workspaceMembers
//   - subscription.* / subscriptionItem.* (camelCase)    → subscriptions
// Unhandled event types are logged and 200'd (so Clerk doesn't retry forever).
//
// `svix`'s `Webhook` class verifies using pure-JS sha256 (via standardwebhooks),
// so this runs in Convex's default V8 runtime — no `"use node"` needed.
//
// TODO(human): in the Clerk Dashboard, register this endpoint URL
//   (https://energized-dove-25.convex.site/clerk-webhook for dev) and subscribe
//   it to organization.*, organizationMembership.*, organizationInvitation.*,
//   subscription.* AND subscriptionItem.*. Then set the signing secret on the
//   Convex deployment:
//     npx convex env set CLERK_WEBHOOK_SIGNING_SECRET whsec_xxx
//   (CLERK_WEBHOOK_SIGNING_SECRET is currently UNSET on dev — until it is set,
//   this endpoint returns 500 by design rather than trusting unverified bodies.)
// ─────────────────────────────────────────────────────────────────────────────

const http = httpRouter();

// Map Clerk's role string → our coarse app role. Clerk's admin role is
// "org:admin"; everything else (incl. "org:support", custom roles) → support.
function mapRole(rawRole: string | null | undefined): "admin" | "support" {
  return rawRole === "org:admin" ? "admin" : "support";
}

// Clerk timestamps are epoch SECONDS on most billing payloads; normalize to ms.
function toMs(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  // Heuristic: < 1e12 ⇒ seconds, else already ms.
  return value < 1e12 ? value * 1000 : value;
}

function pick<T = unknown>(obj: unknown, ...keys: string[]): T | undefined {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return cur as T;
}

const clerkWebhook = httpAction(async (ctx, request) => {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error(
      "[clerk-webhook] CLERK_WEBHOOK_SIGNING_SECRET is not set; refusing to process unverified webhook. Set it via `npx convex env set`.",
    );
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(signingSecret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch (err) {
    console.error("[clerk-webhook] signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = event;

  try {
    switch (type) {
      // ── ORGANIZATIONS ──────────────────────────────────────────────────
      case "organization.created":
      case "organization.updated": {
        const clerkOrgId = pick<string>(data, "id");
        const name = pick<string>(data, "name") ?? "Workspace";
        const slug = pick<string>(data, "slug");
        const createdByClerkUserId = pick<string>(data, "created_by");
        if (clerkOrgId) {
          await ctx.runMutation(internal.clerkWebhooks.upsertOrganization, {
            clerkOrgId,
            name,
            slug,
            createdByClerkUserId,
          });
        }
        break;
      }
      case "organization.deleted": {
        const clerkOrgId = pick<string>(data, "id");
        if (clerkOrgId) {
          await ctx.runMutation(internal.clerkWebhooks.deleteOrganization, {
            clerkOrgId,
          });
        }
        break;
      }

      // ── MEMBERSHIPS ────────────────────────────────────────────────────
      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const clerkOrgId = pick<string>(data, "organization", "id");
        const clerkUserId = pick<string>(data, "public_user_data", "user_id");
        const rawRole = pick<string>(data, "role");
        const firstName =
          pick<string>(data, "public_user_data", "first_name") ?? "";
        const lastName =
          pick<string>(data, "public_user_data", "last_name") ?? "";
        const identifier =
          pick<string>(data, "public_user_data", "identifier") ?? undefined;
        const imageUrl =
          pick<string>(data, "public_user_data", "image_url") ?? undefined;
        const name =
          `${firstName} ${lastName}`.trim() || identifier || "Member";
        if (clerkOrgId && clerkUserId) {
          await ctx.runMutation(internal.clerkWebhooks.upsertMembership, {
            clerkOrgId,
            clerkUserId,
            role: mapRole(rawRole),
            name,
            email: identifier,
            imageUrl,
            orgName: pick<string>(data, "organization", "name"),
            orgSlug: pick<string>(data, "organization", "slug"),
          });
        }
        break;
      }
      case "organizationMembership.deleted": {
        const clerkOrgId = pick<string>(data, "organization", "id");
        const clerkUserId = pick<string>(data, "public_user_data", "user_id");
        if (clerkOrgId && clerkUserId) {
          await ctx.runMutation(internal.clerkWebhooks.removeMembership, {
            clerkOrgId,
            clerkUserId,
          });
        }
        break;
      }

      // ── BILLING ────────────────────────────────────────────────────────
      // subscription.* and subscriptionItem.* (camelCase). subscriptionItem.* is
      // the authoritative plan+status signal. Payload paths here follow the
      // DOCUMENTED Clerk shape; Phase 2 finalizes them from a logged real event.
      default: {
        if (type.startsWith("subscription")) {
          // Log the raw payload ONCE per deploy to map the empirical path
          // (Phase 0 acceptance: "log one real billing payload").
          console.log(
            `[clerk-webhook] billing event ${type}:`,
            JSON.stringify(data),
          );

          const isItem = type.startsWith("subscriptionItem.");
          const clerkOrgId =
            pick<string>(data, "payer", "organization_id") ??
            pick<string>(data, "organization", "id") ??
            pick<string>(data, "payer", "id");

          // Deletion-ish lifecycle → downgrade in place.
          if (
            type === "subscription.deleted" ||
            type === "subscriptionItem.deleted"
          ) {
            await ctx.runMutation(internal.clerkWebhooks.deleteSubscription, {
              subscriptionId:
                pick<string>(data, "subscription_id") ?? pick<string>(data, "id"),
              subscriptionItemId: isItem ? pick<string>(data, "id") : undefined,
              clerkOrgId,
            });
            break;
          }

          if (!clerkOrgId) {
            console.warn(
              `[clerk-webhook] ${type}: could not resolve clerkOrgId from payload; skipping.`,
            );
            break;
          }

          const planSlug =
            pick<string>(data, "plan", "slug") ??
            pick<string>(data, "items", "0", "plan", "slug") ??
            "free_org";
          // Status comes ONLY from the payload (top-level or first item). Do NOT
          // derive it from the event-type verb ("updated"/"created") — that maps
          // to "incomplete" and would disable AI for an active payer. When absent,
          // upsertSubscription preserves the existing row's status.
          const status =
            pick<string>(data, "status") ??
            pick<string>(data, "items", "0", "status");
          const subscriptionId =
            (isItem
              ? pick<string>(data, "subscription_id")
              : pick<string>(data, "id")) ??
            pick<string>(data, "id") ??
            clerkOrgId;
          const subscriptionItemId = isItem
            ? pick<string>(data, "id")
            : pick<string>(data, "items", "0", "id");

          await ctx.runMutation(internal.clerkWebhooks.upsertSubscription, {
            clerkOrgId,
            subscriptionId,
            subscriptionItemId,
            planSlug,
            status,
            seats: pick<number>(data, "quantity"),
            currentPeriodStart: toMs(
              pick(data, "current_period_start") ??
                pick(data, "period_start"),
            ),
            currentPeriodEnd: toMs(
              pick(data, "current_period_end") ?? pick(data, "period_end"),
            ),
          });
        } else {
          console.log(`[clerk-webhook] unhandled event type: ${type}`);
        }
      }
    }
  } catch (err) {
    // Log + 200: Clerk retries on non-2xx; if our mutation is the problem,
    // retrying the same malformed event forever doesn't help. We've logged it.
    console.error(`[clerk-webhook] error handling ${type}:`, err);
    return new Response("Handled with error (logged)", { status: 200 });
  }

  return new Response(null, { status: 200 });
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkWebhook,
});

// ─────────────────────────────────────────────────────────────────────────────
// M-PESA STK PUSH CALLBACK
//
//   POST  https://<convex-deployment>.convex.site/mpesa-callback
//
// Safaricom Daraja API sends the transaction result here.
// ─────────────────────────────────────────────────────────────────────────────

const mpesaWebhook = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    console.log("[mpesa-webhook] Received payload:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response("Invalid payload structure", { status: 400 });
    }

    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    if (!checkoutRequestID) {
      return new Response("Missing CheckoutRequestID", { status: 400 });
    }

    let status: "completed" | "failed" = "failed";
    let mpesaReceiptNumber: string | undefined = undefined;
    let error: string | undefined = undefined;

    if (resultCode === 0) {
      status = "completed";
      const metadataItems = stkCallback.CallbackMetadata?.Item || [];
      const receiptItem = metadataItems.find((item: any) => item.Name === "MpesaReceiptNumber");
      mpesaReceiptNumber = receiptItem?.Value ? String(receiptItem.Value) : undefined;
    } else {
      status = "failed";
      error = resultDesc || `Transaction failed with code ${resultCode}`;
    }

    // Call Convex mutation to update transaction status and provision subscription
    await ctx.runMutation(api.mpesa.updateMpesaTransactionStatus, {
      checkoutRequestID,
      status,
      mpesaReceiptNumber,
      error,
    });

    return new Response(JSON.stringify({ ResponseCode: "0", ResponseDescription: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[mpesa-webhook] Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

http.route({
  path: "/mpesa-callback",
  method: "POST",
  handler: mpesaWebhook,
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC widget launcher config (Phase 6, additive).
//
//   GET  https://<convex-deployment>.convex.site/widget-config?app_id=<workspaceId>
//
// The framework-free `loader.js` on the CUSTOMER's page (no Convex client) fetches
// this to style the launcher BUBBLE before the iframe even loads: position,
// margins, colors, corner radius, logo URL, notification sound, title.
//
// CORS '*' so it can be called cross-origin from any embedding site. The iframe
// widget itself uses the richer `api.widget.getConfig` Convex query (which
// includes behavior settings); this endpoint is the bubble-only subset the
// vanilla loader needs. Bad/missing app_id ⇒ 400 with safe defaults so the
// loader can still render a usable bubble rather than crash.
// ─────────────────────────────────────────────────────────────────────────────

const WIDGET_CONFIG_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Edge/CDN can cache the styled bubble config briefly; appearance changes are
  // not latency-critical and this shields the deployment from launcher floods.
  "Cache-Control": "public, max-age=60",
};

// Bubble-only defaults — MUST stay in sync with widget.ts DEFAULT_APPEARANCE.
// Returned (with 400) when app_id is missing/invalid so the loader still styles
// a usable bubble instead of throwing.
const DEFAULT_BUBBLE = {
  themeColor: "#0F172A",
  buttonColor: "#4F46E5",
  cornerRadius: 16,
  title: "Chat with us",
  titleColor: "#FFFFFF",
  logoUrl: null as string | null,
  position: "bottom-right",
  bottomMargin: 20,
  sideMargin: 20,
  notificationSound: true,
};

const widgetConfig = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const appId = url.searchParams.get("app_id");

  if (!appId) {
    return new Response(JSON.stringify(DEFAULT_BUBBLE), {
      status: 400,
      headers: { "Content-Type": "application/json", ...WIDGET_CONFIG_CORS },
    });
  }

  // The Convex query validates `workspaceId` as a real id; a malformed string
  // throws an ArgumentValidationError, which we catch and treat as "unknown".
  let config: Awaited<ReturnType<typeof getConfigSafe>> = null;
  try {
    config = await getConfigSafe(ctx, appId);
  } catch {
    config = null;
  }

  if (!config) {
    return new Response(JSON.stringify(DEFAULT_BUBBLE), {
      status: 400,
      headers: { "Content-Type": "application/json", ...WIDGET_CONFIG_CORS },
    });
  }

  // Project the appearance down to the bubble-only fields the loader styles.
  const a = config.appearance;
  const body = {
    themeColor: a.themeColor,
    buttonColor: a.buttonColor,
    cornerRadius: a.cornerRadius,
    title: a.title,
    titleColor: a.titleColor,
    logoUrl: a.logoUrl,
    position: a.position,
    bottomMargin: a.bottomMargin,
    sideMargin: a.sideMargin,
    notificationSound: a.notificationSound,
    // Paid plans (Pro/Scale) hide the "Powered by" footer; false for Free.
    removeBranding: config.removeBranding,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...WIDGET_CONFIG_CORS },
  });
});

// Reuse the PUBLIC widget query so this endpoint and the iframe widget agree on
// defaults/logo resolution. Cast the validated app_id to the workspace id type;
// an invalid id surfaces as a thrown ArgumentValidationError (caught above).
async function getConfigSafe(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  appId: string,
) {
  return await ctx.runQuery(api.widget.getConfig, {
    workspaceId: appId as Id<"workspaces">,
  });
}

http.route({
  path: "/widget-config",
  method: "GET",
  handler: widgetConfig,
});

// CORS preflight for cross-origin GETs from embedding sites.
http.route({
  path: "/widget-config",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: WIDGET_CONFIG_CORS });
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// META (WhatsApp) WEBHOOK
//
//   GET  https://<convex-deployment>.convex.site/meta-webhook   ← verification
//   POST https://<convex-deployment>.convex.site/meta-webhook   ← events
//
// Register this URL in the Meta App Dashboard → WhatsApp → Configuration.
// Set the Verify Token to the value of META_WEBHOOK_VERIFY_TOKEN env var.
// Subscribe to: messages, messaging_postbacks, message_deliveries
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/meta-webhook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      console.error("[meta-webhook] META_WEBHOOK_VERIFY_TOKEN not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[meta-webhook] Webhook verified successfully");
      return new Response(challenge, { status: 200 });
    }

    console.warn("[meta-webhook] Verification failed — token mismatch");
    return new Response("Verification failed", { status: 403 });
  }),
});

http.route({
  path: "/meta-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const receivedAt = Date.now();

    // ── HMAC signature verification (Meta X-Hub-Signature-256) ─────────────
    // Must verify BEFORE parsing to prevent injection attacks.
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      const signature = request.headers.get("x-hub-signature-256") ?? "";
      if (signature) {
        // Verify using Web Crypto (V8 compatible).
        try {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(appSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
          );
          const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
          const hashHex = Array.from(new Uint8Array(sigBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const expected = `sha256=${hashHex}`;

          // Timing-safe compare.
          let mismatch = signature.length !== expected.length ? 1 : 0;
          for (let i = 0; i < Math.min(signature.length, expected.length); i++) {
            mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
          }
          if (mismatch !== 0) {
            console.warn("[meta-webhook] HMAC signature mismatch — rejecting");
            return new Response("Forbidden", { status: 403 });
          }
        } catch (e) {
          console.error("[meta-webhook] HMAC verification error:", e);
          return new Response("Forbidden", { status: 403 });
        }
      }
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    try {
      if (body.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      for (const entry of body.entry as Record<string, unknown>[]) {
        for (const change of (entry.changes as Record<string, unknown>[]) ?? []) {
          const value = change.value as Record<string, unknown>;
          if (!value) continue;

          const phoneNumberId = (value.metadata as Record<string, string>)?.phone_number_id;
          if (!phoneNumberId) continue;

          // ── Status updates (delivery receipts) ────────────────────────────
          const statuses = value.statuses as Record<string, unknown>[] | undefined;
          if (statuses) {
            for (const st of statuses) {
              const wamid = st.id as string;
              const status = st.status as "sent" | "delivered" | "read" | "failed";
              if (!wamid || !["sent", "delivered", "read", "failed"].includes(status)) continue;

              const errorMsg = (st.errors as { message?: string }[] | undefined)?.[0]?.message;
              await ctx.runMutation(internal.whatsapp.handleStatusUpdate, {
                providerMessageId: wamid,
                status,
                phoneNumberId,
                errorMessage: errorMsg,
              });
            }
          }

          // ── Inbound messages ──────────────────────────────────────────────
          const messages = value.messages as Record<string, unknown>[] | undefined;
          if (!messages) continue;

          const contacts = value.contacts as { wa_id: string; profile?: { name?: string } }[] | undefined;

          for (const msg of messages) {
            const fromNumber = msg.from as string;
            const msgType = msg.type as string;
            const providerMessageId = msg.id as string;

            if (!fromNumber || !msgType || !providerMessageId) continue;

            // Resolve sender name from contacts array.
            const waContact = contacts?.find((c) => c.wa_id === fromNumber);
            const senderName = waContact?.profile?.name ?? fromNumber;

            // ── Derive body + media fields per message type ────────────────
            let body_ = "";
            let mediaId: string | undefined;
            let mediaMimeType: string | undefined;
            let mediaCaption: string | undefined;
            let mediaFileName: string | undefined;
            let mediaDuration: number | undefined;

            switch (msgType) {
              case "text": {
                body_ = (msg.text as { body?: string })?.body ?? "";
                break;
              }
              case "image": {
                const m = msg.image as { id?: string; mime_type?: string; caption?: string };
                mediaId = m?.id;
                mediaMimeType = m?.mime_type;
                mediaCaption = m?.caption;
                body_ = mediaCaption ? `📷 ${mediaCaption}` : "📷 Image";
                break;
              }
              case "video": {
                const m = msg.video as { id?: string; mime_type?: string; caption?: string };
                mediaId = m?.id;
                mediaMimeType = m?.mime_type;
                mediaCaption = m?.caption;
                body_ = mediaCaption ? `🎥 ${mediaCaption}` : "🎥 Video";
                break;
              }
              case "audio": {
                const m = msg.audio as { id?: string; mime_type?: string };
                mediaId = m?.id;
                mediaMimeType = m?.mime_type;
                body_ = "🎵 Audio message";
                break;
              }
              case "voice": {
                const m = msg.voice as { id?: string; mime_type?: string };
                mediaId = m?.id;
                mediaMimeType = m?.mime_type;
                body_ = "🎤 Voice message";
                break;
              }
              case "document": {
                const m = msg.document as {
                  id?: string;
                  mime_type?: string;
                  filename?: string;
                  caption?: string;
                };
                mediaId = m?.id;
                mediaMimeType = m?.mime_type;
                mediaCaption = m?.caption;
                mediaFileName = m?.filename;
                body_ = mediaFileName ? `📄 ${mediaFileName}` : "📄 Document";
                break;
              }
              case "sticker": {
                const m = msg.sticker as { id?: string; mime_type?: string };
                mediaId = m?.id;
                mediaMimeType = m?.mime_type;
                body_ = "🎭 Sticker";
                break;
              }
              case "location": {
                const l = msg.location as {
                  latitude?: number;
                  longitude?: number;
                  name?: string;
                  address?: string;
                };
                body_ = l?.name
                  ? `📍 ${l.name}${l.address ? `, ${l.address}` : ""}`
                  : `📍 Location (${l?.latitude}, ${l?.longitude})`;
                break;
              }
              case "contacts": {
                const cts = msg.contacts as { name?: { formatted_name?: string } }[] | undefined;
                const name = cts?.[0]?.name?.formatted_name ?? "Contact";
                body_ = `👤 Shared contact: ${name}`;
                break;
              }
              case "reaction": {
                const r = msg.reaction as { emoji?: string };
                body_ = r?.emoji ? `Reacted with ${r.emoji}` : "Reaction";
                break;
              }
              case "button": {
                body_ = (msg.button as { text?: string })?.text ?? "Button reply";
                break;
              }
              case "interactive": {
                const i = msg.interactive as {
                  button_reply?: { title?: string };
                  list_reply?: { title?: string };
                };
                body_ = i?.button_reply?.title ?? i?.list_reply?.title ?? "Interactive reply";
                break;
              }
              default:
                body_ = `[Unsupported message type: ${msgType}]`;
            }

            // Truncate payload for logging.
            const rawPayload = JSON.stringify(msg).slice(0, 8192);

            await ctx.runMutation(internal.whatsapp.handleIncomingMessage, {
              phoneNumberId,
              fromNumber,
              senderName,
              messageType: msgType,
              body: body_,
              providerMessageId,
              mediaId,
              mediaMimeType,
              mediaCaption,
              mediaFileName,
              mediaDuration,
              rawPayload,
            });
          }
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[meta-webhook] Error processing event:", err);
      // Still return 200 to prevent Meta from retrying (we've logged the error).
      return new Response(JSON.stringify({ status: "error", error: String(err) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;

