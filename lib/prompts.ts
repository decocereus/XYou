import z from "zod";
import type { Segment, SegmentSchema } from "./backend-schemas";
import type { ContentFormatSchema, Tone, ToneSchema } from "./content-types";

type PromptInput = {
  transcript: string;
  segments?: Segment[];
  tone?: Tone;
  count?: number;
};

export function buildTweetPrompt({
  transcript,
  segments,
  tone,
  count = 6,
}: PromptInput) {
  return `
	 SYSTEM:
	 You convert long transcripts into atomic, viral-quality tweets. You output ONLY valid JSON. No explanations, no notes.
	 
	 DEFINITIONS:
	 - "High-signal" = extremely distilled insight, no filler, no setup, no context that doesn't increase impact.
	 - "Hook" = first 3–7 words that create tension, contradiction, or a payoff gap.
	 - "Specificity" = concrete phrasing, no abstractions or clichés.
	 - "Compression" = reduce 1–2 minutes of transcript into one clear, sharp idea.
	 - "Tone: ${tone ?? "concise and engaging"}"
	 
	 CONSTRAINTS:
	 - Generate ${count} tweets.
	 - Each tweet ≤ 280 chars.
	 - No threads. Each item stands alone.
	 - Hashtags: 0–2 MAX and only if they materially increase clarity.
	 - If timestamps help, use format [mm:ss]. (${
     segments?.length ? "Allowed" : "Unavailable – avoid time references."
   })
	 - No generic motivational lines.
	 - No summarizing the whole transcript; extract *atomic insights*.
	 
	 QUALITY HEURISTICS (optimize for these):
	 1. A hook that forces the scroll to stop.
	 2. A single point, not multiple.
	 3. Concrete nouns > vague claims.
	 4. Contradictions, counter-intuitive insights, or bold truths are preferred.
	 5. Avoid adjectives unless they increase clarity.
	 6. No emojis unless they sharpen meaning.
	 
	 OUTPUT FORMAT (strict JSON only):
	 {
		"items": [
		  { "content": "tweet text" }
		]
	 }
	 If you cannot produce valid JSON for any reason, output {}.
	 TRANSCRIPT:
	 ${transcript}
	 `;
}

export function buildThreadPrompt({
  transcript,
  segments,
  tone,
  count = 3,
}: PromptInput) {
  return `
 SYSTEM:
 You turn transcripts into structured, high-retention Twitter threads. Output ONLY strict JSON. No extra text.
 
 DEFINITIONS:
 - Hook = a contradiction, a bold insight, or a curiosity gap.
 - Middle = specific steps, examples, or quotes.
 - CTA = “If you want X, follow for Y” or a tightly relevant action.
 
 RULES:
 - Generate ${count} threads.
 - Each thread = 5–10 tweets.
 - Each tweet < 280 chars.
 - Use exact quotes sparingly when they increase impact.
 - Timestamps allowed only if helpful: ${segments?.length ? "yes" : "no"}.
 - "Tone: ${tone ?? "concise and engaging"}"
 
 THREAD STRUCTURE:
 1. Strong hook.
 2. 3–7 body tweets with *one idea per tweet*.
 3. Crisp CTA.
 
 OUTPUT FORMAT:
 {
	"items": [
	  { "parts": ["tweet1", "tweet2", "..."] }
	]
 }
 If you cannot produce valid JSON for any reason, output {}.
 TRANSCRIPT:
 ${transcript}
 `;
}

export function buildLinkedInPrompt({
  transcript,
  segments,
  tone,
  count = 3,
}: PromptInput) {
  return `
 SYSTEM:
 You convert transcripts into punchy, insight-dense LinkedIn posts.
 Output ONLY strict JSON.
 
 POST STRUCTURE:
 1. Hook sentence (must create tension or a payoff gap).
 2. 2–4 specific insights with examples or micro-lessons.
 3. Closing takeaway or question.
 4. Add 2–4 relevant hashtags ONLY if they improve context.

RULES FOR POSTS:
 - Generate ${count} posts.
 - No corporate fluff.
 - No “in today’s world…” boilerplate.
 - Prefer concrete insights.
 - Tone: ${tone ?? "professional and sharp"}.
 - Timestamp references: ${segments?.length ? "allowed" : "not available"}.
 - "Tone: ${tone ?? "concise and engaging"}"
 
 OUTPUT FORMAT:
 {
	"items": [
	  { "content": "LinkedIn post text" }
	]
 }
 If you cannot produce valid JSON for any reason, output {}.
 TRANSCRIPT:
 ${transcript}
 `;
}

export function buildShortsPrompt({
  transcript,
  segments,
  tone,
  count = 3,
}: PromptInput) {
  return `
 SYSTEM:
 You convert transcripts into short-form video scripts for TikTok/Shorts. Output ONLY strict JSON.
 
 SCRIPT FORMAT:
 - Hook (3 seconds): contradiction, curiosity, or extreme specificity.
 - Body (20–40s): 3–5 beats max. Use [visual cue] brackets.
 - CTA (5s): Specific and relevant.
 
 STYLE:
- Generate ${count} scripts.
 - Fast-paced.
 - High-contrast ideas.
 - No rambling.
 - Tone: ${tone ?? "viral"}.
 - Timestamps: ${segments?.length ? "allowed" : "not available"}.
 
 OUTPUT FORMAT:
 {
	"items": [
	  { "content": "script with cues" }
	]
 }
 If you cannot produce valid JSON for any reason, output {}.

 TRANSCRIPT:
 ${transcript}
 `;
}

export function buildPrompt(input: {
  format: z.infer<typeof ContentFormatSchema>;
  transcript: string;
  segments?: z.infer<typeof SegmentSchema>[];
  tone?: z.infer<typeof ToneSchema>;
  count?: number;
}) {
  const { format, ...rest } = input;
  switch (format) {
    case "tweet":
      return buildTweetPrompt(rest);
    case "thread":
      return buildThreadPrompt(rest);
    case "linkedin":
      return buildLinkedInPrompt(rest);
    case "shorts":
      return buildShortsPrompt(rest);
    default:
      return buildTweetPrompt(rest);
  }
}
