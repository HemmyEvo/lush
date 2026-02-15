/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Create Order (Updated with Name/Address)
export const create = mutation({
  args: {
    customerName: v.string(),
    customerAddress: v.string(),
    items: v.array(v.object({
      id: v.id("products"),
      name: v.string(),
      quantity: v.number(),
      price: v.number(),
    })),
    totalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("orders", {
      ...args,
      status: "NEW", // Starts with Assistant
      createdAt: Date.now(),
    });
  },
});

// 2. Get Orders by Status (For Assistant/Kitchen)
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .collect();
  },
});

// 3. Update Status
export const updateStatus = mutation({
  args: { 
    id: v.id("orders"), 
    status: v.string(),
    riderName: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status as any,
      riderName: args.riderName,
    });
  },
});

// 4. Get ALL Completed Orders (For Admin Reports)
export const getCompleted = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "COMPLETED"))
      .order("desc") // Newest first
      .take(100);    // Limit to last 100 for performance (optional)
  },
});