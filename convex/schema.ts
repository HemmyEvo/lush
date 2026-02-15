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
    status: v.union(
      v.literal("NEW"),
      v.literal("IN_PROGRESS"),
      v.literal("READY"),
      v.literal("COMPLETED"),
    ),

    riderId: v.optional(v.id("riders")),
    riderName: v.optional(v.string()),
    riderPhone: v.optional(v.string()),
    riderCompanyName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_date", ["createdAt"])
    .index("by_customer_type", ["customerType"]),
});
