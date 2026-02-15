import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. PRODUCTS TABLE
  products: defineTable({
    name: v.string(),
    price: v.number(),
    category: v.string(),
    description: v.optional(v.string()),
    inStock: v.boolean(),
  }),

  // 2. ORDERS TABLE
  orders: defineTable({
    // Customer Info (Collected at POS)
    customerName: v.string(), 
    customerAddress: v.string(), // New Field
    
    // The Cart
    items: v.array(v.object({
      id: v.id("products"),
      name: v.string(),
      quantity: v.number(),
      price: v.number(),
    })),

    totalAmount: v.number(),
    
    // Lifecycle Status
    status: v.union(
      v.literal("NEW"),           // Sales -> Assistant
      v.literal("IN_PROGRESS"),   // Assistant -> Kitchen
      v.literal("READY"),         // Kitchen -> Assistant
      v.literal("COMPLETED")      // Assistant -> Rider
    ),

    // Logistics
    riderName: v.optional(v.string()),
    createdAt: v.number(), 
  })
  .index("by_status", ["status"]) 
  .index("by_date", ["createdAt"]), // Useful for Admin sorting
});