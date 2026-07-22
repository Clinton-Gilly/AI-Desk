// ─────────────────────────────────────────────────────────────────────────────
// Contacts + ContactIdentities
//
// contacts: canonical person record per workspace.
// contactIdentities: maps one Contact to many provider identities so that the
//   same person on WhatsApp AND Instagram is a single Contact in the CRM.
//
// resolveOrCreate: the main entry point, called by the webhook handler on
//   every inbound message. O(1) via by_workspace_provider_user index.
// ─────────────────────────────────────────────────────────────────────────────

import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireOrgMember } from "./lib/auth";

// ── Shared validators ─────────────────────────────────────────────────────────

const providerValidator = v.union(
  v.literal("website"),
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("telegram"),
  v.literal("email"),
);

const contactDoc = v.object({
  _id: v.id("contacts"),
  _creationTime: v.number(),
  workspaceId: v.id("workspaces"),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  createdAt: v.number(),
});

function toContactDoc(row: Doc<"contacts">) {
  return {
    _id: row._id,
    _creationTime: row._creationTime,
    workspaceId: row.workspaceId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    notes: row.notes,
    tags: row.tags,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** List contacts for the caller's workspace, newest-seen first. */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(contactDoc),
  handler: async (ctx, { limit }) => {
    const { workspace } = await requireOrgMember(ctx);
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .take(Math.min(limit ?? 100, 500));
    return rows.map(toContactDoc);
  },
});

/** Get one contact by ID, org-authorized. */
export const get = query({
  args: { contactId: v.id("contacts") },
  returns: v.union(contactDoc, v.null()),
  handler: async (ctx, { contactId }) => {
    const { workspace } = await requireOrgMember(ctx);
    const row = await ctx.db.get(contactId);
    if (!row || row.workspaceId !== workspace._id) return null;
    return toContactDoc(row);
  },
});

// ── Internal mutations ────────────────────────────────────────────────────────

/**
 * resolveOrCreate — the main contact-resolution entry point.
 *
 * Lookup: by_workspace_provider_user index → O(1).
 * If found: update lastSeenAt (and optionally displayName/avatar).
 * If not found: create Contact + ContactIdentity rows.
 *
 * Returns the contactId.
 */
export const resolveOrCreate = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    provider: providerValidator,
    providerUserId: v.string(),   // phone number, Instagram ID, email, visitorId
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id("contacts"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // O(1) identity lookup.
    const identity = await ctx.db
      .query("contactIdentities")
      .withIndex("by_workspace_provider_user", (q) =>
        q
          .eq("workspaceId", args.workspaceId)
          .eq("provider", args.provider)
          .eq("providerUserId", args.providerUserId),
      )
      .first();

    if (identity) {
      // Update lastSeenAt + display info if the provider sends updated info.
      await ctx.db.patch(identity._id, {
        lastSeenAt: now,
        ...(args.displayName && args.displayName !== identity.displayName
          ? { displayName: args.displayName }
          : {}),
        ...(args.avatarUrl ? { avatarUrl: args.avatarUrl } : {}),
      });
      // Bump the contact's lastSeenAt too.
      await ctx.db.patch(identity.contactId, { lastSeenAt: now });
      return identity.contactId;
    }

    // Create a new Contact.
    const contactId = await ctx.db.insert("contacts", {
      workspaceId: args.workspaceId,
      displayName: args.displayName || args.providerUserId,
      avatarUrl: args.avatarUrl,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
    });

    // Create the identity mapping.
    await ctx.db.insert("contactIdentities", {
      contactId,
      workspaceId: args.workspaceId,
      provider: args.provider,
      providerUserId: args.providerUserId,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      lastSeenAt: now,
    });

    return contactId;
  },
});

/** Get contact + all identities for a given contactId. Internal use. */
export const getWithIdentities = internalQuery({
  args: { contactId: v.id("contacts") },
  returns: v.union(
    v.object({
      contact: contactDoc,
      identities: v.array(
        v.object({
          _id: v.id("contactIdentities"),
          provider: providerValidator,
          providerUserId: v.string(),
          displayName: v.optional(v.string()),
          lastSeenAt: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { contactId }) => {
    const row = await ctx.db.get(contactId);
    if (!row) return null;
    const identities = await ctx.db
      .query("contactIdentities")
      .withIndex("by_contact", (q) => q.eq("contactId", contactId))
      .collect();
    return {
      contact: toContactDoc(row),
      identities: identities.map((i) => ({
        _id: i._id,
        provider: i.provider,
        providerUserId: i.providerUserId,
        displayName: i.displayName,
        lastSeenAt: i.lastSeenAt,
      })),
    };
  },
});
