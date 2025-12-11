import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const segmentValidator = v.object({
  start: v.number(),
  end: v.number(),
  text: v.string(),
});

// Get cached transcript by video ID
export const getByVideoId = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transcripts")
      .withIndex("by_video_id", (q) => q.eq("videoId", args.videoId))
      .first();
  },
});

// Get transcript by ID
export const get = query({
  args: { id: v.id("transcripts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Cache a transcript
export const create = mutation({
  args: {
    videoId: v.string(),
    url: v.string(),
    text: v.string(),
    segments: v.array(segmentValidator),
    duration: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("transcripts")
      .withIndex("by_video_id", (q) => q.eq("videoId", args.videoId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        text: args.text,
        segments: args.segments,
        duration: args.duration,
        language: args.language,
      });
      return existing._id;
    }

    return await ctx.db.insert("transcripts", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Delete old transcripts (cleanup)
export const deleteOlderThan = mutation({
  args: { olderThanMs: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const old = await ctx.db
      .query("transcripts")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();

    for (const transcript of old) {
      await ctx.db.delete(transcript._id);
    }

    return old.length;
  },
});
