import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Analyzed style shape
const analyzedStyleValidator = v.object({
  tone: v.string(),
  vocabulary: v.string(),
  sentenceStructure: v.string(),
  hooks: v.string(),
  patterns: v.array(v.string()),
  summary: v.string(),
});

// Get all style profiles for a user
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("styleProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get a specific style profile
export const get = query({
  args: { id: v.id("styleProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get style profile by name for a user
export const getByName = query({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("styleProfiles")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();
  },
});

// Create a new style profile
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    exampleTweets: v.array(v.string()),
    analyzedStyle: analyzedStyleValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("styleProfiles", {
      userId: args.userId,
      name: args.name,
      exampleTweets: args.exampleTweets,
      analyzedStyle: args.analyzedStyle,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a style profile
export const update = mutation({
  args: {
    id: v.id("styleProfiles"),
    name: v.optional(v.string()),
    exampleTweets: v.optional(v.array(v.string())),
    analyzedStyle: v.optional(analyzedStyleValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a style profile
export const remove = mutation({
  args: { id: v.id("styleProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
