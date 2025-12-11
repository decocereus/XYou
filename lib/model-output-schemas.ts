import { z } from "zod";

export const GeneratedItemSchema = z.object({
  id: z.string().optional(),
  content: z.string(),
  charCount: z.number().int().nonnegative().optional(),
  tone: z.string().nullable().optional(),
  parts: z.array(z.string()).nullable().optional(),
  meta: z.record(z.any()).optional(),
});

export const GenerateResponseSchema = z.object({
  items: z.array(GeneratedItemSchema),
  pass_meta: z
    .object({
      generator_model: z.string(),
      critic_model: z.string().optional(),
      passes: z.number(),
      timestamp: z.string().datetime(),
    })
    .optional(),
});

export type GeneratedItem = z.infer<typeof GeneratedItemSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

// Style profile schema (matches Convex)
export const StyleProfileSchema = z.object({
  tone: z.string(),
  vocabulary: z.string(),
  sentenceStructure: z.string(),
  hooks: z.string(),
  patterns: z.array(z.string()),
  summary: z.string(),
});

export type StyleProfile = z.infer<typeof StyleProfileSchema>;
