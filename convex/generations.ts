import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const outputItemValidator = v.object({
  id: v.string(),
  content: v.string(),
  parts: v.optional(v.array(v.string())),
});

// Get recent generations for a user
export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// Get generations by format
export const listByFormat = query({
  args: {
    userId: v.id("users"),
    format: v.union(
      v.literal("tweet"),
      v.literal("thread"),
      v.literal("linkedin"),
      v.literal("shorts"),
      v.literal("script")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("generations")
      .withIndex("by_user_format", (q) =>
        q.eq("userId", args.userId).eq("format", args.format)
      )
      .order("desc")
      .take(limit);
  },
});

// Get a specific generation
export const get = query({
  args: { id: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Save a generation
export const create = mutation({
  args: {
    userId: v.id("users"),
    styleProfileId: v.optional(v.id("styleProfiles")),
    sourceType: v.union(
      v.literal("youtube"),
      v.literal("text"),
      v.literal("topic")
    ),
    sourceContent: v.string(),
    format: v.union(
      v.literal("tweet"),
      v.literal("thread"),
      v.literal("linkedin"),
      v.literal("shorts"),
      v.literal("script")
    ),
    output: v.array(outputItemValidator),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Delete a generation
export const remove = mutation({
  args: { id: v.id("generations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
