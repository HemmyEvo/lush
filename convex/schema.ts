import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    name: v.string(),
    price: v.number(),
    category: v.string(),
    description: v.optional(v.string()),
    inStock: v.boolean(),
  }),

  riders: defineTable({
    name: v.string(),
    phone: v.string(),
    companyName: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  orders: defineTable({
    // --- Customer Info ---
    customerName: v.string(),
    customerAddress: v.optional(v.string()), // Required for delivery
    customerType: v.union(v.literal("DELIVERY"), v.literal("WALK_IN")),
    salesManager: v.optional(v.string()), // Name of POS user

    // --- Cart Items ---
    items: v.array(
      v.object({
        id: v.id("products"),
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
      }),
    ),
    totalAmount: v.number(),

    // --- Order Flow Status ---
    // NEW: Sent from POS, visible in Kitchen
    // READY: Done in Kitchen, visible to Assistant/Rider
    // COMPLETED: Handed over/Delivered
    status: v.union(
      v.literal("NEW"), 
      v.literal("READY"), 
      v.literal("COMPLETED")
    ),

    // --- Logistics (Filled by Assistant) ---
    riderId: v.optional(v.id("riders")),
    riderName: v.optional(v.string()),
    riderPhone: v.optional(v.string()),
    riderCompanyName: v.optional(v.string()),

    // --- Timestamps ---
    createdAt: v.number(), // Set by POS
    productionCompletedAt: v.optional(v.number()), // Set by Kitchen
    assistantCompletedAt: v.optional(v.number()), // Set by Assistant
  })
    .index("by_status", ["status"]) // For filtering lists
    .index("by_date", ["createdAt"]) // For reports
    .index("by_customer_type", ["customerType"]),
});
