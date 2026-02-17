import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Create Order (POS -> Kitchen)
export const create = mutation({
  args: {
    customerName: v.string(),
    customerType: v.union(v.literal("DELIVERY"), v.literal("WALK_IN")),
    customerAddress: v.optional(v.string()),
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
    return await ctx.db.insert("orders", {
      ...args,
      status: "NEW", // DIRECTLY TO PRODUCTION
      createdAt: Date.now(),
    });
  },
});

// 2. Get Orders by Status (Used by Kitchen & Assistant)
export const getByStatus = query({
  args: { status: v.union(v.literal("NEW"), v.literal("READY"), v.literal("COMPLETED")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc") // Newest first
      .collect();
  },
});

// 3. Get Completed Orders (For Reports)
export const getCompleted = query({
  handler: async (ctx) => {
    // We limit to last 100 to prevent crashing the report generator on huge datasets
    // In a real app, you'd filter by date range
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "COMPLETED"))
      .order("desc")
      .collect(); 
  },
});

// 4. Update Status (Kitchen -> Ready -> Assistant -> Completed)
export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(v.literal("READY"), v.literal("COMPLETED")),
    // Optional rider details when completing
    riderId: v.optional(v.id("riders")),
    riderName: v.optional(v.string()),
    riderPhone: v.optional(v.string()),
    riderCompanyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, ...riderDetails } = args;

    const updates: {
      status: "READY" | "COMPLETED";
      productionCompletedAt?: number;
      assistantCompletedAt?: number;
      riderId?: typeof args.riderId;
      riderName?: string;
      riderPhone?: string;
      riderCompanyName?: string;
    } = { status };

    if (status === "READY") {
      updates.productionCompletedAt = Date.now();
    } else if (status === "COMPLETED") {
      updates.assistantCompletedAt = Date.now();
      // Add rider details if provided
      if (riderDetails.riderId) updates.riderId = riderDetails.riderId;
      if (riderDetails.riderName) updates.riderName = riderDetails.riderName;
      if (riderDetails.riderPhone) updates.riderPhone = riderDetails.riderPhone;
      if (riderDetails.riderCompanyName) updates.riderCompanyName = riderDetails.riderCompanyName;
    }

    await ctx.db.patch(id, updates);
  },
});
