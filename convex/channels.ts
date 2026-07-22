// ─────────────────────────────────────────────────────────────────────────────
// Channels — CRUD for the generic channel registry.
//
// Every organization can have multiple channels of different providers:
//   - "WhatsApp Sales" (provider: whatsapp)
//   - "WhatsApp Support" (provider: whatsapp)
//   - "Instagram DMs" (provider: instagram)  ← future
//
// All mutations are admin-gated (connect/disconnect requires admin role).
// Queries are available to any org member (to list channels in settings UI).
// ─────────────────────────────────────────────────────────────────────────────

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireOrgMember, requireAdmin } from "./lib/auth";

// ── Validators ────────────────────────────────────────────────────────────────

const providerValidator = v.union(
  v.literal("website"),
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("telegram"),
  v.literal("email"),
);

const channelStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("error"),
  v.literal("pending"),
);

const channelDoc = v.object({
  _id: v.id("channels"),
  _creationTime: v.number(),
  workspaceId: v.id("workspaces"),
  clerkOrgId: v.string(),
  provider: providerValidator,
  displayName: v.string(),
  status: channelStatusValidator,
  connectedAt: v.optional(v.number()),
  lastActivityAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const waConnectionDoc = v.object({
  _id: v.id("whatsappConnections"),
  _creationTime: v.number(),
  channelId: v.id("channels"),
  workspaceId: v.id("workspaces"),
  businessId: v.optional(v.string()),
  wabaId: v.optional(v.string()),
  phoneNumberId: v.optional(v.string()),
  phoneNumber: v.optional(v.string()),
  displayName: v.optional(v.string()),
  // accessToken intentionally excluded from return type
  tokenExpiresAt: v.optional(v.number()),
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
  updatedAt: v.number(),
});

function toChannelDoc(row: Doc<"channels">) {
  return {
    _id: row._id,
    _creationTime: row._creationTime,
    workspaceId: row.workspaceId,
    clerkOrgId: row.clerkOrgId,
    provider: row.provider,
    displayName: row.displayName,
    status: row.status,
    connectedAt: row.connectedAt,
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toWaConnectionDoc(row: Doc<"whatsappConnections">) {
  return {
    _id: row._id,
    _creationTime: row._creationTime,
    channelId: row.channelId,
    workspaceId: row.workspaceId,
    businessId: row.businessId,
    wabaId: row.wabaId,
    phoneNumberId: row.phoneNumberId,
    phoneNumber: row.phoneNumber,
    displayName: row.displayName,
    // accessToken excluded
    tokenExpiresAt: row.tokenExpiresAt,
    status: row.status,
    errorMessage: row.errorMessage,
    connectedAt: row.connectedAt,
    lastSync: row.lastSync,
    lastWebhookAt: row.lastWebhookAt,
    updatedAt: row.updatedAt,
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** List all channels for the caller's workspace. */
export const list = query({
  args: { provider: v.optional(providerValidator) },
  returns: v.array(channelDoc),
  handler: async (ctx, { provider }) => {
    const { workspace } = await requireOrgMember(ctx);
    const rows = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const filtered = provider ? rows.filter((r) => r.provider === provider) : rows;
    return filtered.map(toChannelDoc);
  },
});

/** Get one channel by ID, org-authorized. */
export const get = query({
  args: { channelId: v.id("channels") },
  returns: v.union(channelDoc, v.null()),
  handler: async (ctx, { channelId }) => {
    const { workspace } = await requireOrgMember(ctx);
    const row = await ctx.db.get(channelId);
    if (!row || row.workspaceId !== workspace._id) return null;
    return toChannelDoc(row);
  },
});

/**
 * Get the WhatsApp channel + connection for this workspace.
 * Returns null if no WhatsApp channel exists yet.
 * This replaces the old `api.whatsapp.getChannel` surface.
 */
export const getWhatsAppChannel = query({
  args: {},
  returns: v.union(
    v.object({
      channel: channelDoc,
      connection: waConnectionDoc,
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const { workspace } = await requireOrgMember(ctx);
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
      channel: toChannelDoc(channel),
      connection: toWaConnectionDoc(conn),
    };
  },
});

// ── Internal helpers (called by whatsapp.ts, dispatcherNode.ts) ───────────────

/** Internal: create or update a WhatsApp channel + connection. */
export const upsertWhatsAppChannel = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    displayName: v.string(),
    businessId: v.optional(v.string()),
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
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
  returns: v.object({ channelId: v.id("channels"), connectionId: v.id("whatsappConnections") }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing channel for this workspace.
    let channel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_provider", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("provider", "whatsapp"),
      )
      .first();

    if (!channel) {
      const id = await ctx.db.insert("channels", {
        workspaceId: args.workspaceId,
        clerkOrgId: args.clerkOrgId,
        provider: "whatsapp",
        displayName: args.displayName || "WhatsApp",
        status: args.status === "connected" ? "active" : "pending",
        connectedAt: args.status === "connected" ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
      channel = (await ctx.db.get(id))!;
    } else {
      await ctx.db.patch(channel._id, {
        status: args.status === "connected" ? "active" : channel.status,
        connectedAt: args.status === "connected" ? now : channel.connectedAt,
        lastActivityAt: now,
        updatedAt: now,
      });
    }

    // Find or create the whatsappConnections row.
    let conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channel!._id))
      .first();

    if (!conn) {
      const id = await ctx.db.insert("whatsappConnections", {
        channelId: channel._id,
        workspaceId: args.workspaceId,
        businessId: args.businessId,
        wabaId: args.wabaId,
        phoneNumberId: args.phoneNumberId,
        phoneNumber: args.phoneNumber,
        displayName: args.displayName,
        accessToken: args.accessToken,
        tokenExpiresAt: args.tokenExpiresAt,
        status: args.status,
        errorMessage: args.errorMessage,
        connectedAt: args.status === "connected" ? now : undefined,
        updatedAt: now,
      });
      conn = (await ctx.db.get(id))!;
    } else {
      await ctx.db.patch(conn._id, {
        businessId: args.businessId ?? conn.businessId,
        wabaId: args.wabaId ?? conn.wabaId,
        phoneNumberId: args.phoneNumberId ?? conn.phoneNumberId,
        phoneNumber: args.phoneNumber ?? conn.phoneNumber,
        displayName: args.displayName ?? conn.displayName,
        accessToken: args.accessToken,
        tokenExpiresAt: args.tokenExpiresAt ?? conn.tokenExpiresAt,
        status: args.status,
        errorMessage: args.errorMessage,
        connectedAt: args.status === "connected" ? (conn.connectedAt ?? now) : conn.connectedAt,
        updatedAt: now,
      });
      conn = (await ctx.db.get(conn._id))!;
    }

    return { channelId: channel._id, connectionId: conn._id };
  },
});

/** Internal: disconnect a WhatsApp channel (admin action). */
export const disconnectWhatsApp = internalMutation({
  args: { workspaceId: v.id("workspaces") },
  returns: v.null(),
  handler: async (ctx, { workspaceId }) => {
    const now = Date.now();
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_provider", (q) =>
        q.eq("workspaceId", workspaceId).eq("provider", "whatsapp"),
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

/** Internal query: load WhatsApp connection by phoneNumberId (O(1) via index). */
export const getConnectionByPhoneNumberId = internalQuery({
  args: { phoneNumberId: v.string() },
  returns: v.union(
    v.object({
      channelId: v.id("channels"),
      workspaceId: v.id("workspaces"),
      phoneNumberId: v.optional(v.string()),
      accessToken: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("connected"),
        v.literal("error"),
        v.literal("disconnected"),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { phoneNumberId }) => {
    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", phoneNumberId))
      .first();
    if (!conn || conn.status !== "connected") return null;
    return {
      channelId: conn.channelId,
      workspaceId: conn.workspaceId,
      phoneNumberId: conn.phoneNumberId,
      accessToken: conn.accessToken,
      status: conn.status,
    };
  },
});

/** Internal: update lastWebhookAt on the connection row. */
export const touchWebhookAt = internalMutation({
  args: { channelId: v.id("channels") },
  returns: v.null(),
  handler: async (ctx, { channelId }) => {
    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .first();
    if (conn) {
      await ctx.db.patch(conn._id, { lastWebhookAt: Date.now(), updatedAt: Date.now() });
    }
    return null;
  },
});

/** Internal: update accessToken + tokenExpiresAt after a token refresh. */
export const updateToken = internalMutation({
  args: {
    channelId: v.id("channels"),
    accessToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { channelId, accessToken, tokenExpiresAt }) => {
    const conn = await ctx.db
      .query("whatsappConnections")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .first();
    if (conn) {
      await ctx.db.patch(conn._id, {
        accessToken,
        tokenExpiresAt,
        status: "connected",
        lastSync: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(channelId, { status: "active", updatedAt: Date.now() });
    }
    return null;
  },
});

/** Internal: load all connected WhatsApp channels (for token refresh cron). */
export const listConnectedWhatsAppChannels = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      channelId: v.id("channels"),
      workspaceId: v.id("workspaces"),
      accessToken: v.optional(v.string()),
      tokenExpiresAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const conns = await ctx.db
      .query("whatsappConnections")
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect();
    return conns.map((c) => ({
      channelId: c.channelId,
      workspaceId: c.workspaceId,
      accessToken: c.accessToken,
      tokenExpiresAt: c.tokenExpiresAt,
    }));
  },
});

// ── Public mutations (admin-gated) ────────────────────────────────────────────

/** Disconnect the WhatsApp channel for this workspace. Admin only. */
export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { workspace } = await requireAdmin(ctx);
    await ctx.runMutation(
      // We call an internal mutation from a public mutation by importing internal.
      // However, since this is in the same file, we call the helper directly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("./_generated/api")).internal.channels.disconnectWhatsApp,
      { workspaceId: workspace._id },
    );
    return null;
  },
});
