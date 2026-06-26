import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireGlobalAdmin } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireGlobalAdmin(ctx);
    return await ctx.db.query("coupons").collect();
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    discountPercent: v.number(),
    maxUses: v.number(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireGlobalAdmin(ctx);
    
    if (args.discountPercent <= 0 || args.discountPercent > 100) {
      throw new ConvexError("Discount percent must be between 1 and 100.");
    }
    
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
      
    if (existing) {
      throw new ConvexError("A coupon with this code already exists.");
    }

    await ctx.db.insert("coupons", {
      code: args.code.toUpperCase(),
      discountPercent: args.discountPercent,
      maxUses: args.maxUses,
      usedCount: 0,
      expiresAt: args.expiresAt,
      createdBy: admin.email,
      active: true,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("coupons"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireGlobalAdmin(ctx);
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const remove = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    await requireGlobalAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// Public query to validate a code before checkout
export const validate = query({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<{ valid: boolean; discountPercent?: number; reason?: string }> => {
    if (!args.code) return { valid: false, reason: "No code provided" };
    
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
      
    if (!coupon) return { valid: false, reason: "Invalid code" };
    if (!coupon.active) return { valid: false, reason: "Code is inactive" };
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: "Code usage limit reached" };
    }
    if (coupon.expiresAt && Date.now() > coupon.expiresAt) {
      return { valid: false, reason: "Code expired" };
    }
    
    return { valid: true, discountPercent: coupon.discountPercent };
  },
});

// Internal/Auth mutation to apply a code during checkout
export const apply = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
      
    if (!coupon || !coupon.active || (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) || (coupon.expiresAt && Date.now() > coupon.expiresAt)) {
      throw new ConvexError("Invalid or expired coupon code");
    }
    
    await ctx.db.patch(coupon._id, { usedCount: coupon.usedCount + 1 });
    return coupon;
  },
});
