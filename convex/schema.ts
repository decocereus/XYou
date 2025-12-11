import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles synced from auth provider
  users: defineTable({
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // User writing style profiles based on example tweets
  styleProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    exampleTweets: v.array(v.string()),
    analyzedStyle: v.object({
      tone: v.string(),
      vocabulary: v.string(),
      sentenceStructure: v.string(),
      hooks: v.string(),
      patterns: v.array(v.string()),
      summary: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  // Content generation history
  generations: defineTable({
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
    output: v.array(
      v.object({
        id: v.string(),
        content: v.string(),
        parts: v.optional(v.array(v.string())),
      })
    ),
    purpose: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_format", ["userId", "format"]),

  // Cached transcripts to avoid re-processing
  transcripts: defineTable({
    videoId: v.string(),
    url: v.string(),
    text: v.string(),
    segments: v.array(
      v.object({
        start: v.number(),
        end: v.number(),
        text: v.string(),
      })
    ),
    duration: v.optional(v.number()),
    language: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_video_id", ["videoId"]),
});
