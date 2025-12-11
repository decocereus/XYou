import { z } from "zod";
const ViralityScore = z.number().min(0).max(10);
const HookStrength = z.number().min(0).max(10);
const Confidence = z.number().min(0).max(1);

export const GeneratedItemSchema = z.object({
  id: z.string().optional(),
  content: z.string(), // tweet/body text
  charCount: z.number().int().nonnegative().optional(),
  tone: z.string().nullable().optional(),
  hashtags: z.array(z.string()).nullable().optional(),
  mentions: z.array(z.string()).nullable().optional(),
  excerpt_source: z.string().nullable().optional(),
  insight_type: z
    .enum([
      "how-to",
      "data",
      "opinion",
      "case-study",
      "quote",
      "counterintuitive",
      "teaser",
      "warning",
    ])
    .nullable()
    .optional(),
  hook_strength: HookStrength.optional(),
  virality_score: ViralityScore.optional(),
  confidence: Confidence.optional(),
  compression_ratio: z.number().min(0).optional(), // input length / output length
  reasons: z.string().nullable().optional(), // 10-20 words
  safety: z
    .object({
      nsfw: z.boolean().optional(),
      medical_claims: z.boolean().optional(),
      legal_claims: z.boolean().optional(),
    })
    .optional(),
  meta: z.record(z.any()).optional(), // room for future fields
});

export const GenerateResponseSchema = z.object({
  items: z.array(GeneratedItemSchema),
  pass_meta: z
    .object({
      generator_model: z.string(),
      critic_model: z.string(),
      passes: z.number(),
      timestamp: z.string().datetime(),
    })
    .optional(),
});

export type GeneratedItem = z.infer<typeof GeneratedItemSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
