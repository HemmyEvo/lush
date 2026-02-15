import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("riders").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("riders", {
      ...args,
      companyName: args.companyName?.trim() || undefined,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("riders"),
    name: v.string(),
    phone: v.string(),
    companyName: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      phone: args.phone,
      companyName: args.companyName?.trim() || undefined,
      isActive: args.isActive,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("riders") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
