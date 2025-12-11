import { z } from "zod";

export const CONTENT_FORMATS = [
  "tweet",
  "thread",
  "linkedin",
  "shorts",
  "script",
] as const;

export const TONES = [
  "professional",
  "casual",
  "viral",
  "educational",
  "provocative",
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];
export type Tone = (typeof TONES)[number];

export const INSIGHT_TYPES = [
  "how-to",
  "data",
  "opinion",
  "case-study",
  "quote",
  "counterintuitive",
  "teaser",
  "warning",
] as const;

export type InsightType = (typeof INSIGHT_TYPES)[number];

export type GeneratedContentItem = {
  id: string;
  format: ContentFormat;
  content: string;
  parts?: string[];
  charCount?: number;
  metadata?: Record<string, unknown>;
  tone?: Tone;
};

export const ContentFormatSchema = z.enum(CONTENT_FORMATS);
export const ToneSchema = z.enum(TONES);

export const contentFormatLabels: Record<ContentFormat, string> = {
  tweet: "Tweet",
  thread: "Thread",
  linkedin: "LinkedIn Post",
  shorts: "Shorts Script",
  script: "Video Script",
};

export const toneLabels: Record<Tone, string> = {
  professional: "Professional",
  casual: "Casual",
  viral: "Viral",
  educational: "Educational",
  provocative: "Provocative",
};

export const contentFormatCharLimit: Partial<Record<ContentFormat, number>> = {
  tweet: 280,
  thread: 280, // per tweet
};

export const defaultBatchSize: Record<ContentFormat, number> = {
  tweet: 6,
  thread: 4,
  linkedin: 3,
  shorts: 3,
  script: 1,
};

// Style profile type (matches Convex schema)
export type StyleProfile = {
  tone: string;
  vocabulary: string;
  sentenceStructure: string;
  hooks: string;
  patterns: string[];
  summary: string;
};
