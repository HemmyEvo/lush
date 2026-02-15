/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    customerName: v.string(),
    customerAddress: v.optional(v.string()),
    customerType: v.union(v.literal("DELIVERY"), v.literal("WALK_IN")),
    salesManager: v.optional(v.string()),
    items: v.array(
      v.object({
        id: v.id("products"),
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
      }),
    ),
    totalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("orders", {
      ...args,
      customerAddress: args.customerAddress?.trim() || undefined,
      salesManager: args.salesManager?.trim() || undefined,
      status: "NEW",
      createdAt: Date.now(),
    });
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orders").withIndex("by_date").order("desc").take(500);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
    riderId: v.optional(v.id("riders")),
    riderName: v.optional(v.string()),
    riderPhone: v.optional(v.string()),
    riderCompanyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status as any,
      riderId: args.riderId,
      riderName: args.riderName,
      riderPhone: args.riderPhone,
      riderCompanyName: args.riderCompanyName,
    });
  },
});

export const getCompleted = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "COMPLETED"))
      .order("desc")
      .take(100);
  },
});
