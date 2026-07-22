// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher — V8 runtime (default)
//
// Contains:
//   enqueueOutbound()  — plain helper called by mutations (sendFromAgent,
//                        finalizeAgentMessage). Inserts an outgoingMessages row
//                        and schedules the dispatcherNode send action.
//   updateDeliveryStatus — internalMutation called by dispatcherNode after
//                          delivery (success OR failure).
//   markDelivered      — internalMutation called by webhook status updates.
//
// The AI and human-agent code NEVER call the Meta API directly. They call
// enqueueOutbound() → dispatcherNode.processOutboundMessage → WhatsAppProvider.
// ─────────────────────────────────────────────────────────────────────────────

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ── Helper: enqueue an outbound message ──────────────────────────────────────

/**
 * Called by mutations (sendFromAgent, finalizeAgentMessage) to queue an
 * outbound message for delivery via the appropriate ChannelProvider.
 *
 * Only queues when provider is NOT "website" — website delivery is implicit
 * (the message row in the DB is the delivery mechanism for the widget).
 */
export async function enqueueOutbound(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    messageId: Id<"messages">;
    workspaceId: Id<"workspaces">;
    channelId: Id<"channels">;
    provider: string;
  },
): Promise<void> {
  if (args.provider === "website" || !args.channelId) return;

  const now = Date.now();
  const outgoingId = await ctx.db.insert("outgoingMessages", {
    conversationId: args.conversationId,
    messageId: args.messageId,
    workspaceId: args.workspaceId,
    channelId: args.channelId,
    provider: args.provider,
    status: "queued",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Schedule the actual send in the Node runtime (needs fetch for Meta API).
  await ctx.scheduler.runAfter(
    0,
    internal.dispatcherNode.processOutboundMessage,
    { outgoingMessageId: outgoingId },
  );
}

// ── Internal mutations called by dispatcherNode ───────────────────────────────

/** Mark an outgoing message as successfully sent. */
export const markSent = internalMutation({
  args: {
    outgoingMessageId: v.id("outgoingMessages"),
    providerMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { outgoingMessageId, providerMessageId }) => {
    const now = Date.now();
    const row = await ctx.db.get(outgoingMessageId);
    if (!row) return null;

    await ctx.db.patch(outgoingMessageId, {
      status: "sent",
      providerMessageId,
      updatedAt: now,
    });
    // Mirror onto the canonical message row.
    await ctx.db.patch(row.messageId, {
      waMessageId: providerMessageId,
      deliveryStatus: "sent",
    });
    return null;
  },
});

/** Mark an outgoing message as failed (increment attempts, optionally retry). */
export const markFailed = internalMutation({
  args: {
    outgoingMessageId: v.id("outgoingMessages"),
    error: v.string(),
    retryDelayMs: v.optional(v.number()), // if set, reschedule after this delay
  },
  returns: v.null(),
  handler: async (ctx, { outgoingMessageId, error, retryDelayMs }) => {
    const now = Date.now();
    const row = await ctx.db.get(outgoingMessageId);
    if (!row) return null;

    const newAttempts = row.attempts + 1;
    const isFinalFailure = !retryDelayMs;

    await ctx.db.patch(outgoingMessageId, {
      status: isFinalFailure ? "failed" : "sending",
      attempts: newAttempts,
      lastAttemptAt: now,
      lastError: error,
      updatedAt: now,
    });

    if (isFinalFailure) {
      // Mirror final failure onto the message row.
      await ctx.db.patch(row.messageId, { deliveryStatus: "failed" });
    } else {
      // Re-schedule the send action (called from dispatcherNode with the delay).
      await ctx.scheduler.runAfter(
        retryDelayMs,
        internal.dispatcherNode.processOutboundMessage,
        { outgoingMessageId },
      );
    }
    return null;
  },
});

/**
 * Update delivery status from a provider status webhook event.
 * Called when Meta sends a "delivered" or "read" status update for a wamid.
 */
export const updateDeliveryStatus = internalMutation({
  args: {
    providerMessageId: v.string(), // the wamid
    status: v.union(
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { providerMessageId, status, errorMessage }) => {
    const now = Date.now();

    // Find the outgoing message by providerMessageId.
    const outgoing = await ctx.db
      .query("outgoingMessages")
      .filter((q) => q.eq(q.field("providerMessageId"), providerMessageId))
      .first();

    if (outgoing) {
      await ctx.db.patch(outgoing._id, {
        status,
        updatedAt: now,
        ...(errorMessage ? { lastError: errorMessage } : {}),
      });
      // Mirror onto the canonical message row.
      await ctx.db.patch(outgoing.messageId, {
        deliveryStatus: status,
      });
    }
    return null;
  },
});

// ── V8 Queries & Mutations Transferred from dispatcherNode ────────────────────

/** Load the outgoing message row with all enriched data needed for delivery. */
export const getOutgoingDetails = internalQuery({
  args: { outgoingMessageId: v.id("outgoingMessages") },
  returns: v.any(),
  handler: async (ctx, { outgoingMessageId }) => {
    const outgoing = await ctx.db.get(outgoingMessageId);
    if (!outgoing) return null;

    const convo = await ctx.db.get(outgoing.conversationId);
    if (!convo) return null;

    const msg = await ctx.db.get(outgoing.messageId);
    if (!msg) return null;

    // Load WhatsApp credentials.
    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", outgoing.channelId))
      .first();

    return {
      ...outgoing,
      body: msg.body,
      to: convo.visitorId,   // For WhatsApp: visitorId = customer phone number
      accessToken: conn?.accessToken ?? null,
      phoneNumberId: conn?.phoneNumberId ?? null,
    };
  },
});

/** Patch an attachment row (called from Node actions via runMutation). */
export const patchAttachment = internalMutation({
  args: {
    attachmentId: v.id("attachments"),
    storageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("stored"), v.literal("failed")),
    errorNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { attachmentId, storageId, status }) => {
    const patch: {
      storageId?: Id<"_storage">;
      status: "stored" | "failed";
    } = { status };
    if (storageId) patch.storageId = storageId;
    await ctx.db.patch(attachmentId, patch);
    return null;
  },
});

/** Load WhatsApp connection credentials by channelId (for token refresh). */
export const getConnectionDetailsForChannel = internalQuery({
  args: { channelId: v.id("channels") },
  returns: v.union(
    v.object({
      accessToken: v.optional(v.string()),
      tokenExpiresAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, { channelId }) => {
    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .first();
    if (!conn) return null;
    return { accessToken: conn.accessToken, tokenExpiresAt: conn.tokenExpiresAt };
  },
});

// ── Debug Queries ────────────────────────────────────────────────────────────

export const listOutgoing = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("outgoingMessages").order("desc").take(10);
  },
});

export const listWebhookLogs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("webhookLogs").order("desc").take(10);
  },
});


