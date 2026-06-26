import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

import { requireAdmin } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireAdmin(ctx);
    return await ctx.db
      .query("addOnPacks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
  },
});

export const purchaseAddOn = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    type: v.union(v.literal("ai_messages"), v.literal("kb_documents")),
    quantity: v.number(),
    mpesaReceiptNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("addOnPacks", {
      workspaceId: args.workspaceId,
      clerkOrgId: args.clerkOrgId,
      type: args.type,
      quantity: args.quantity,
      remainingQuantity: args.quantity,
      purchasedAt: Date.now(),
      mpesaReceiptNumber: args.mpesaReceiptNumber,
    });
  },
});

export const consumeAddOn = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.union(v.literal("ai_messages"), v.literal("kb_documents")),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Find earliest active pack with remaining quantity
    const packs = await ctx.db
      .query("addOnPacks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .filter((q) => q.gt(q.field("remainingQuantity"), 0))
      .collect();

    // Sort by purchasedAt
    packs.sort((a, b) => a.purchasedAt - b.purchasedAt);

    let amountToConsume = args.amount;
    
    for (const pack of packs) {
      if (amountToConsume <= 0) break;

      const consumedFromPack = Math.min(amountToConsume, pack.remainingQuantity);
      
      await ctx.db.patch(pack._id, {
        remainingQuantity: pack.remainingQuantity - consumedFromPack,
      });

      amountToConsume -= consumedFromPack;
    }

    // Return true if fully consumed from add-ons, false if still missing (needs overage)
    return amountToConsume === 0;
  },
});
