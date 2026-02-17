// convex/riders.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("riders").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("riders")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existing) return existing._id; // Return existing ID if found

    return await ctx.db.insert("riders", {
      ...args,
      isActive: true,
      reviews: [],
      createdAt: Date.now(),
    });
  },
});

export const addReview = mutation({
  args: {
    riderId: v.id("riders"),
    review: v.string(),
  },
  handler: async (ctx, args) => {
    const rider = await ctx.db.get(args.riderId);
    if (!rider) throw new Error("Rider not found");

    const currentReviews = rider.reviews || [];
    await ctx.db.patch(args.riderId, {
      reviews: [...currentReviews, args.review],
    });
  },
});
