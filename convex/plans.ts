import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { PLANS } from "./lib/plans";
import { requireGlobalAdmin } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("billingPlans").collect();
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("billingPlans")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (plan) return plan;
    // Fallback to defaults
    if (args.key in PLANS) {
      return PLANS[args.key as keyof typeof PLANS];
    }
    return null;
  },
});

export const create = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    priceMonthly: v.number(),
    priceYearly: v.optional(v.number()),
    trialDays: v.optional(v.number()),
    tagline: v.string(),
    highlighted: v.boolean(),
    features: v.array(v.string()),
    limits: v.object({
      aiMessagesPerMonth: v.number(),
      kbDocuments: v.number(),
      crawlPages: v.number(),
      seats: v.number(),
      conversationsPerMonth: v.optional(v.number()),
      dataRetentionDays: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Only admins can create plans
    await requireGlobalAdmin(ctx);

    const existingPlans = await ctx.db.query("billingPlans").collect();
    if (existingPlans.length >= 10) {
      throw new ConvexError("Maximum of 10 billing plans allowed.");
    }

    const existingKey = await ctx.db
      .query("billingPlans")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existingKey) {
      throw new ConvexError("A plan with this key already exists.");
    }

    await ctx.db.insert("billingPlans", {
      ...args,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("billingPlans"),
    key: v.string(),
    name: v.string(),
    priceMonthly: v.number(),
    priceYearly: v.optional(v.number()),
    trialDays: v.optional(v.number()),
    tagline: v.string(),
    highlighted: v.boolean(),
    features: v.array(v.string()),
    limits: v.object({
      aiMessagesPerMonth: v.number(),
      kbDocuments: v.number(),
      crawlPages: v.number(),
      seats: v.number(),
      conversationsPerMonth: v.optional(v.number()),
      dataRetentionDays: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await requireGlobalAdmin(ctx);

    const existingKey = await ctx.db
      .query("billingPlans")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existingKey && existingKey._id !== args.id) {
      throw new ConvexError("Another plan with this key already exists.");
    }

    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("billingPlans") },
  handler: async (ctx, args) => {
    await requireGlobalAdmin(ctx);
    
    // Check if it's the free_org plan (we should ideally prevent deleting the fallback floor plan)
    const plan = await ctx.db.get(args.id);
    if (!plan) return;
    if (plan.key === "free_org") {
      throw new ConvexError("Cannot delete the default free_org plan.");
    }

    await ctx.db.delete(args.id);
  },
});

export const initDefaultPlans = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("billingPlans").collect();
    if (existing.length > 0) return;

    for (const slug of ["free_org", "pro", "scale"] as const) {
      const def = PLANS[slug];
      
      let priceMonthly = 0;
      let priceYearly = 0;
      let trialDays = 0;
      let tagline = "";
      let highlighted = false;

      if (slug === "pro") {
        priceMonthly = 6500;
        priceYearly = 65000;
        trialDays = 14;
        tagline = "For growing teams that need crawling and proactive messaging.";
        highlighted = true;
      } else if (slug === "scale") {
        priceMonthly = 26000;
        priceYearly = 260000;
        trialDays = 0;
        tagline = "High-volume support with the largest quotas.";
      } else {
        priceMonthly = 0;
        priceYearly = 0;
        trialDays = 0;
        tagline = "Everything you need to launch an AI chat widget.";
      }

      await ctx.db.insert("billingPlans", {
        key: slug,
        name: def.name,
        priceMonthly,
        priceYearly,
        trialDays,
        tagline,
        highlighted,
        features: def.features as string[],
        limits: def.limits,
      });
    }
  },
});
