// ─────────────────────────────────────────────────────────────────────────────
// convex/whatsapp.ts
//
// WhatsApp channel management — V8 queries and mutations.
// Node.js actions (OAuth exchange, media download, token refresh) live in
// whatsappNode.ts.
//
// Architecture:
//   - All WhatsApp state now lives in `channels` + `whatsappConnections`
//     (the old `whatsappChannels` table is kept for backward-compat data safety
//     but is no longer written to by new code).
//   - `getChannel` is a backward-compat shim; new code uses
//     `api.channels.getWhatsAppChannel`.
//   - `handleIncomingMessage` now supports ALL message types, resolves/creates
//     contacts, creates attachments rows for media, and logs to webhookLogs.
// ─────────────────────────────────────────────────────────────────────────────

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireOrgMember, requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const AGENT_DEBOUNCE_MS = 1200;
const MAX_BODY_LEN = 4000;
const MAX_LOG_PAYLOAD = 8192; // 8 KB

// ── Backward-compat public query ──────────────────────────────────────────────
// The channels/page.tsx still calls `api.whatsapp.getChannel`. This shim
// delegates to the new `channels.getWhatsAppChannel` query.

export const getChannel = query({
  args: { workspaceId: v.id("workspaces") },
  returns: v.union(
    v.object({
      channelId: v.id("channels"),
      connectionId: v.id("whatsappConnections"),
      wabaId: v.optional(v.string()),
      phoneNumberId: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      displayName: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("connected"),
        v.literal("error"),
        v.literal("disconnected"),
      ),
      errorMessage: v.optional(v.string()),
      connectedAt: v.optional(v.number()),
      lastSync: v.optional(v.number()),
      lastWebhookAt: v.optional(v.number()),
      tokenExpiresAt: v.optional(v.number()),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { workspaceId }) => {
    const { workspace } = await requireOrgMember(ctx);
    if (workspace._id !== workspaceId) return null;

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_provider", (q) =>
        q.eq("workspaceId", workspace._id).eq("provider", "whatsapp"),
      )
      .first();
    if (!channel) return null;

    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
      .first();
    if (!conn) return null;

    return {
      channelId: channel._id,
      connectionId: conn._id,
      wabaId: conn.wabaId,
      phoneNumberId: conn.phoneNumberId,
      phoneNumber: conn.phoneNumber,
      displayName: conn.displayName,
      status: conn.status,
      errorMessage: conn.errorMessage,
      connectedAt: conn.connectedAt,
      lastSync: conn.lastSync,
      lastWebhookAt: conn.lastWebhookAt,
      tokenExpiresAt: conn.tokenExpiresAt,
      updatedAt: conn.updatedAt,
    };
  },
});

// ── Public mutation: disconnect (admin only) ──────────────────────────────────

export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { workspace } = await requireAdmin(ctx);
    const now = Date.now();

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_provider", (q) =>
        q.eq("workspaceId", workspace._id).eq("provider", "whatsapp"),
      )
      .first();
    if (!channel) return null;

    await ctx.db.patch(channel._id, { status: "inactive", updatedAt: now });

    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
      .first();
    if (conn) {
      await ctx.db.patch(conn._id, {
        status: "disconnected",
        accessToken: undefined,
        updatedAt: now,
      });
    }
    return null;
  },
});

// ── Internal mutation: called by whatsappNode.exchangeCodeAndSave ─────────────

export const saveCredentials = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    businessId: v.optional(v.string()),
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    displayName: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("connected"),
      v.literal("error"),
      v.literal("disconnected"),
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delegate to channels.upsertWhatsAppChannel (the canonical writer).
    await ctx.runMutation(internal.channels.upsertWhatsAppChannel, {
      workspaceId: args.workspaceId,
      clerkOrgId: args.clerkOrgId,
      displayName: args.displayName ?? "WhatsApp",
      businessId: args.businessId,
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
      phoneNumber: args.phoneNumber,
      accessToken: args.accessToken,
      tokenExpiresAt: args.tokenExpiresAt,
      status: args.status,
      errorMessage: args.errorMessage,
    });
    return null;
  },
});

// ── Internal mutation: handle inbound WhatsApp message from webhook ────────────
//
// Called by http.ts for each parsed message in the webhook payload.
// Supports all WhatsApp message types. Resolves/creates contacts.
// Schedules media downloads for non-text types.

export const handleIncomingMessage = internalMutation({
  args: {
    phoneNumberId: v.string(),
    fromNumber: v.string(),
    senderName: v.string(),
    messageType: v.string(),
    body: v.string(),
    providerMessageId: v.string(),
    // Media fields (present for image/video/audio/document/sticker/voice)
    mediaId: v.optional(v.string()),
    mediaMimeType: v.optional(v.string()),
    mediaCaption: v.optional(v.string()),
    mediaFileName: v.optional(v.string()),
    mediaDuration: v.optional(v.number()),
    // Webhook logging
    rawPayload: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx,
    {
      phoneNumberId,
      fromNumber,
      senderName,
      messageType,
      body,
      providerMessageId,
      mediaId,
      mediaMimeType,
      mediaCaption,
      mediaFileName,
      mediaDuration,
      rawPayload,
    },
  ) => {
    const startedAt = Date.now();

    // ── 1. Look up the WhatsApp connection by phoneNumberId (O(1) index) ────
    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", phoneNumberId))
      .first();

    if (!conn || conn.status !== "connected") {
      // Log ignored event — useful for debugging misconfigured webhooks.
      await ctx.db.insert("webhookLogs", {
        provider: "whatsapp",
        event: `message.${messageType}`,
        payload: rawPayload.slice(0, MAX_LOG_PAYLOAD),
        processingStatus: "ignored",
        errorMessage: `No connected channel found for phoneNumberId: ${phoneNumberId}`,
        receivedAt: startedAt,
        processedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      });
      return null;
    }

    const { workspaceId, channelId } = conn;

    // Update lastWebhookAt (non-blocking patch).
    await ctx.db.patch(conn._id, { lastWebhookAt: Date.now(), updatedAt: Date.now() });

    // ── 2. Resolve or create the contact ────────────────────────────────────
    const contactId = await ctx.runMutation(internal.contacts.resolveOrCreate, {
      workspaceId,
      provider: "whatsapp",
      providerUserId: fromNumber,
      displayName: senderName || fromNumber,
    });

    const now = Date.now();

    // ── 3. Find or create conversation ──────────────────────────────────────
    // Key: (workspaceId, visitorId=fromNumber). Reuse an open conversation;
    // create a new one only if none exist or all are closed.
    let convo = await ctx.db
      .query("conversations")
      .withIndex("by_workspace_visitor", (q) =>
        q.eq("workspaceId", workspaceId).eq("visitorId", fromNumber),
      )
      .first();

    // If the conversation is closed, start a fresh one.
    if (convo?.status === "closed") {
      convo = null;
    }

    if (!convo) {
      const convoId = await ctx.db.insert("conversations", {
        workspaceId,
        visitorId: fromNumber,
        visitorName: senderName || fromNumber,
        lastMessageAt: now,
        lastVisitorMessageAt: now,
        mode: "ai",
        status: "open",
        // Omnichannel fields
        provider: "whatsapp",
        channelId,
        contactId,
        conversationState: "ai",
      });
      convo = (await ctx.db.get(convoId))!;
    } else {
      // Patch the omnichannel fields if missing (backward-compat for old rows).
      const patch: {
        provider?: "website" | "whatsapp" | "instagram" | "messenger" | "telegram" | "email";
        channelId?: Id<"channels">;
        contactId?: Id<"contacts">;
      } = {};
      if (!convo.provider) patch.provider = "whatsapp";
      if (!convo.channelId) patch.channelId = channelId;
      if (!convo.contactId) patch.contactId = contactId;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(convo._id, patch);
      }
    }

    // ── 4. Insert the message ────────────────────────────────────────────────
    const trimmed = body.slice(0, MAX_BODY_LEN);
    if (trimmed.trim().length === 0 && !mediaId) return null;

    const messageId = await ctx.db.insert("messages", {
      conversationId: convo._id,
      author: "visitor",
      body: trimmed || (mediaId ? `[${messageType}]` : ""),
      waMessageId: providerMessageId,
      deliveryStatus: "delivered", // inbound = already delivered to us
    });

    // ── 5. Create attachment row for media messages ──────────────────────────
    if (mediaId) {
      const attachmentId = await ctx.db.insert("attachments", {
        messageId,
        conversationId: convo._id,
        workspaceId,
        provider: "whatsapp",
        mimeType: mediaMimeType,
        caption: mediaCaption ?? mediaFileName,
        fileName: mediaFileName,
        duration: mediaDuration,
        status: "pending",
        createdAt: now,
      });

      // Schedule async media download (Meta URLs expire in ~5 min).
      if (conn.accessToken) {
        await ctx.scheduler.runAfter(
          0,
          internal.dispatcherNode.downloadAndStoreMedia,
          {
            attachmentId,
            mediaId,
            accessToken: conn.accessToken,
          },
        );
      }
    }

    // ── 6. Trigger AI agent (if conversation is in AI mode) ──────────────────
    const isAiMode = (convo.mode ?? "ai") === "ai";
    if (isAiMode && trimmed.trim().length > 0) {
      const nextEpoch = (convo.agentRunEpoch ?? 0) + 1;

      if (convo.pendingAgentJobId) {
        try { await ctx.scheduler.cancel(convo.pendingAgentJobId); } catch { /* ok */ }
      }

      const jobId = await ctx.scheduler.runAfter(
        AGENT_DEBOUNCE_MS,
        internal.agent.run.respondToVisitorMessage,
        { conversationId: convo._id },
      );

      await ctx.db.patch(convo._id, {
        lastMessageAt: now,
        lastVisitorMessageAt: now,
        agentRunEpoch: nextEpoch,
        pendingAgentJobId: jobId,
      });
    } else {
      await ctx.db.patch(convo._id, {
        lastMessageAt: now,
        lastVisitorMessageAt: now,
      });
    }

    // ── 7. Log the webhook event ─────────────────────────────────────────────
    await ctx.db.insert("webhookLogs", {
      channelId,
      workspaceId,
      provider: "whatsapp",
      event: `message.${messageType}`,
      payload: rawPayload.slice(0, MAX_LOG_PAYLOAD),
      processingStatus: "ok",
      receivedAt: startedAt,
      processedAt: Date.now(),
      durationMs: Date.now() - startedAt,
    });

    return null;
  },
});

// ── Internal mutation: update delivery status from Meta status webhook ─────────

export const handleStatusUpdate = internalMutation({
  args: {
    providerMessageId: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    phoneNumberId: v.string(),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { providerMessageId, status, errorMessage }) => {
    // Find the outgoing message by providerMessageId.
    const outgoing = await ctx.db
      .query("outgoingMessages")
      .filter((q) => q.eq(q.field("providerMessageId"), providerMessageId))
      .first();

    if (outgoing) {
      const now = Date.now();
      await ctx.db.patch(outgoing._id, { status, updatedAt: now });
      await ctx.db.patch(outgoing.messageId, {
        deliveryStatus: status,
      });
    }

    // Also update by waMessageId on messages directly (covers any gaps).
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_wa_message_id", (q) => q.eq("waMessageId", providerMessageId))
      .first();
    if (msg) {
      await ctx.db.patch(msg._id, { deliveryStatus: status });
    }

    return null;
  },
});

// ── Internal mutation: check + schedule token refresh (called by cron) ────────

export const checkTokenExpiry = internalMutation({
  args: {},
  returns: v.number(), // count of channels scheduled for refresh
  handler: async (ctx) => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const threshold = Date.now() + sevenDaysMs;

    const conns = await ctx.db
      .query("whatsappConnections")
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect();

    let count = 0;
    for (const conn of conns) {
      if (!conn.tokenExpiresAt || conn.tokenExpiresAt < threshold) {
        // Schedule token refresh.
        await ctx.scheduler.runAfter(
          count * 5000, // stagger by 5s to avoid thundering herd
          internal.whatsappNode.refreshToken,
          { channelId: conn.channelId },
        );
        count++;
      }
    }
    return count;
  },
});

// ── Public mutation: simulate inbound test message (admin only) ─────────────

import { ConvexError } from "convex/values";

export const simulateTestMessage = mutation({
  args: {
    body: v.string(),
    fromNumber: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { body, fromNumber }) => {
    const { workspace } = await requireAdmin(ctx);

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_provider", (q) =>
        q.eq("workspaceId", workspace._id).eq("provider", "whatsapp"),
      )
      .first();

    if (!channel || channel.status !== "active") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No active WhatsApp channel found for this workspace.",
      });
    }

    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
      .first();

    if (!conn || !conn.phoneNumberId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No WhatsApp connection credentials found.",
      });
    }

    const mockFromNumber = fromNumber || "+15550000000";
    const mockSenderName = "Test WhatsApp User";
    const mockWamid = `wamid.HBgL${Math.random().toString(36).substring(2, 10)}`;

    await ctx.runMutation(internal.whatsapp.handleIncomingMessage, {
      phoneNumberId: conn.phoneNumberId,
      fromNumber: mockFromNumber,
      senderName: mockSenderName,
      messageType: "text",
      body,
      providerMessageId: mockWamid,
      rawPayload: JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            id: conn.wabaId,
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: conn.phoneNumber,
                    phone_number_id: conn.phoneNumberId,
                  },
                  contacts: [
                    {
                      profile: { name: mockSenderName },
                      wa_id: mockFromNumber,
                    },
                  ],
                  messages: [
                    {
                      from: mockFromNumber,
                      id: mockWamid,
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      text: { body },
                      type: "text",
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    });

    return null;
  },
});

export const updateConnectionCredentials = mutation({
  args: {
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { workspace } = await requireAdmin(ctx);

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_provider", (q) =>
        q.eq("workspaceId", workspace._id).eq("provider", "whatsapp"),
      )
      .first();

    if (!channel) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No active WhatsApp channel found.",
      });
    }

    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
      .first();

    if (!conn) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No WhatsApp connection found.",
      });
    }

    const patch: {
      wabaId?: string;
      phoneNumberId?: string;
      phoneNumber?: string;
      displayName?: string;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.wabaId !== undefined) patch.wabaId = args.wabaId;
    if (args.phoneNumberId !== undefined) patch.phoneNumberId = args.phoneNumberId;
    if (args.phoneNumber !== undefined) patch.phoneNumber = args.phoneNumber;
    if (args.displayName !== undefined) patch.displayName = args.displayName;

    await ctx.db.patch(conn._id, patch);

    // Also update the channel display name if provided
    if (args.displayName) {
      await ctx.db.patch(channel._id, {
        displayName: args.displayName,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});


