import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Get all products (for the Menu)
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// 2. Add a new product (for Admin)
export const add = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("products", {
      name: args.name,
      price: args.price,
      category: args.category,
      inStock: true, // Default to true
    });
  },
});

// 3. Delete a product (if needed)
export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});