import z from "zod";
import type { Segment, SegmentSchema } from "./backend-schemas";
import type { ContentFormatSchema, Tone, ToneSchema } from "./content-types";
import { sanitizePromptInput, sanitizePurposeInput } from "./prompt-sanitizer";

// Analyzed style type from style profiles
export type AnalyzedStyle = {
  tone: string;
  vocabulary: string;
  sentenceStructure: string;
  hooks: string;
  patterns: string[];
  summary: string;
};

type PromptInput = {
  transcript: string;
  segments?: Segment[];
  tone?: Tone;
  count?: number;
  style?: AnalyzedStyle;
  purpose?: string;
};

// Human-like writing constraints applied to all content generation
const HUMAN_WRITING_CONSTRAINTS = `
CRITICAL WRITING RULES (NEVER VIOLATE):
- NEVER use emojis under any circumstances
- NEVER use em-dashes (—). Use commas, periods, or semicolons instead
- NEVER use hashtags
- NEVER start with "Here's the thing" or similar AI phrases
- NEVER use "In today's world", "Let me tell you", "I'll be honest"
- Write like a real human sharing insights with a friend
- Use contractions naturally (don't, won't, can't, it's)
- Vary sentence length. Short punches. Then longer when needed.
- One idea per post. If it needs explaining, it's two posts.
- Avoid adjectives unless they add concrete meaning
- No corporate speak, no filler words, no fluff
- Start with the insight, not the setup
`;

// Build style injection block if style is provided
function buildStyleBlock(style?: AnalyzedStyle): string {
  if (!style) return "";

  return `
WRITING STYLE TO EMULATE:
- Tone: ${sanitizePromptInput(style.tone)}
- Vocabulary: ${sanitizePromptInput(style.vocabulary)}
- Sentence Structure: ${sanitizePromptInput(style.sentenceStructure)}
- Hook Patterns: ${sanitizePromptInput(style.hooks)}
- Key Patterns: ${style.patterns.map((p) => sanitizePromptInput(p)).join(", ")}
- Style Summary: ${sanitizePromptInput(style.summary)}

IMPORTANT: Match this style closely while maintaining the content's authenticity.
`;
}

// Build purpose block if provided
function buildPurposeBlock(purpose?: string): string {
  if (!purpose) return "";

  return `
CONTENT PURPOSE:
${sanitizePurposeInput(purpose)}

Tailor the content specifically for this purpose while maintaining authenticity.
`;
}

export function buildTweetPrompt({
  transcript,
  segments,
  tone,
  count = 6,
  style,
  purpose,
}: PromptInput) {
  return `
SYSTEM:
You convert long transcripts into atomic, viral-quality tweets. You output ONLY valid JSON. No explanations, no notes.

DEFINITIONS:
- "High-signal" = extremely distilled insight, no filler, no setup, no context that doesn't increase impact.
- "Hook" = first 3-7 words that create tension, contradiction, or a payoff gap.
- "Specificity" = concrete phrasing, no abstractions or clichés.
- "Compression" = reduce 1-2 minutes of transcript into one clear, sharp idea.
- "Tone: ${tone ?? "concise and engaging"}"

${HUMAN_WRITING_CONSTRAINTS}
${buildStyleBlock(style)}
${buildPurposeBlock(purpose)}

CONSTRAINTS:
- Generate ${count} tweets.
- Each tweet ≤ 280 chars.
- No threads. Each item stands alone.
- No hashtags ever.
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
  style,
  purpose,
}: PromptInput) {
  return `
SYSTEM:
You turn transcripts into structured, high-retention Twitter threads. Output ONLY strict JSON. No extra text.

DEFINITIONS:
- Hook = a contradiction, a bold insight, or a curiosity gap.
- Middle = specific steps, examples, or quotes.
- CTA = "If you want X, follow for Y" or a tightly relevant action.

${HUMAN_WRITING_CONSTRAINTS}
${buildStyleBlock(style)}
${buildPurposeBlock(purpose)}

RULES:
- Generate ${count} threads.
- Each thread = 5-10 tweets.
- Each tweet < 280 chars.
- Use exact quotes sparingly when they increase impact.
- Timestamps allowed only if helpful: ${segments?.length ? "yes" : "no"}.
- "Tone: ${tone ?? "concise and engaging"}"

THREAD STRUCTURE:
1. Strong hook.
2. 3-7 body tweets with *one idea per tweet*.
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
  style,
  purpose,
}: PromptInput) {
  return `
SYSTEM:
You convert transcripts into punchy, insight-dense LinkedIn posts.
Output ONLY strict JSON.

POST STRUCTURE:
1. Hook sentence (must create tension or a payoff gap).
2. 2-4 specific insights with examples or micro-lessons.
3. Closing takeaway or question.

${HUMAN_WRITING_CONSTRAINTS}
${buildStyleBlock(style)}
${buildPurposeBlock(purpose)}

RULES FOR POSTS:
- Generate ${count} posts.
- No corporate fluff.
- No "in today's world…" boilerplate.
- Prefer concrete insights.
- Tone: ${tone ?? "professional and sharp"}.
- Timestamp references: ${segments?.length ? "allowed" : "not available"}.
- No hashtags.

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
  style,
  purpose,
}: PromptInput) {
  return `
SYSTEM:
You convert transcripts into short-form video scripts for TikTok/Shorts. Output ONLY strict JSON.

SCRIPT FORMAT:
- Hook (3 seconds): contradiction, curiosity, or extreme specificity.
- Body (20-40s): 3-5 beats max. Use [visual cue] brackets.
- CTA (5s): Specific and relevant.

${HUMAN_WRITING_CONSTRAINTS}
${buildStyleBlock(style)}
${buildPurposeBlock(purpose)}

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

export function buildScriptPrompt({
  transcript,
  topic,
  style,
  purpose,
}: {
  transcript: string;
  topic: string;
  style?: AnalyzedStyle;
  purpose?: string;
}) {
  return `
SYSTEM:
You are a script writer. You will analyze the style of the provided transcript and write a NEW script on the given topic using that same style.

${HUMAN_WRITING_CONSTRAINTS}
${buildStyleBlock(style)}
${buildPurposeBlock(purpose)}

YOUR TASK:
1. Analyze the speaking style, pacing, vocabulary, and structure of the transcript.
2. Write a completely new script on the topic: "${sanitizePurposeInput(topic)}"
3. Match the style of the original transcript closely.
4. Keep it engaging and structured for video content.

STYLE REFERENCE TRANSCRIPT:
${transcript}

OUTPUT FORMAT:
{
  "script": "Your full script here...",
  "styleNotes": "Brief notes on what style elements you matched"
}

If you cannot produce valid JSON for any reason, output {}.
`;
}

export function buildPrompt(input: {
  format: z.infer<typeof ContentFormatSchema>;
  transcript: string;
  segments?: z.infer<typeof SegmentSchema>[];
  tone?: z.infer<typeof ToneSchema>;
  count?: number;
  style?: AnalyzedStyle;
  purpose?: string;
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

export const generatorPrompt = ({
  transcript,
  count,
  tone,
  format,
  segmentsPresent,
  style,
  purpose,
}: {
  transcript: string;
  count: number;
  tone?: string | null;
  format: string;
  segmentsPresent: boolean;
  style?: AnalyzedStyle;
  purpose?: string;
}) => `
SYSTEM:
You are a content generator. Produce ${count} ${
  format === "tweet" ? "tweets" : format + " items"
} from the transcript below.

${HUMAN_WRITING_CONSTRAINTS}
${buildStyleBlock(style)}
${buildPurposeBlock(purpose)}

OUTPUT RULES:
- Output ONLY valid JSON matching the schema below. No extra prose.
- Each item MUST include a unique "id" field (e.g., "item-1", "item-2", etc.).
- Each item must include: id, content, charCount.
- If you cannot produce valid JSON, output {}.

SCHEMA:
{
  "items": [
    {
      "id": "item-1",
      "content": "the ${format} text",
      "charCount": 140
    }
  ]
}

CONSTRAINTS:
- Each ${format} ≤ 280 chars.
- Tone: ${tone ?? "concise and engaging"}.
- Timestamps: ${segmentsPresent ? "allowed as [mm:ss]" : "not available"}.
- Prioritize atomic insights, hooks, and specificity.
- NO hashtags. NO emojis. NO em-dashes.

TRANSCRIPT:
"""${transcript}"""
`;

export const criticPrompt = ({
  itemsJson,
  transcript,
}: {
  itemsJson: string;
  transcript: string;
}) => `
SYSTEM:
You are a harsh, constructive critic for short social content. You will score and critique each item provided.

INPUT:
- items: ${itemsJson}
- transcript: (provided for context; do not copy it into your critique) """${transcript}"""

TASK:
For each item, return JSON array of objects:
{ "id": "<same id>", "ok": boolean, "score": 0-10, "issues": ["concise bullet"], "fix_suggestion": "one specific change" }

Scoring criteria:
- Does it have a stop-on-scroll hook?
- Is it specific and novel?
- Does it contain hashtags, emojis, or em-dashes? (automatic -3 points each)
- Does it sound like AI wrote it? (automatic -2 points)
- Is it under 280 characters?

Return ONLY JSON array as described above. No prose.
`;

export const refinerPrompt = ({
  item,
  feedback,
  transcript,
  tone,
  style,
}: {
  item: { id: string; content: string };
  feedback: { issues: string[]; fix_suggestion: string };
  transcript: string;
  tone?: string | null;
  style?: AnalyzedStyle;
}) => `
SYSTEM:
You are a precise editor that must improve the provided item using the critic feedback.

${HUMAN_WRITING_CONSTRAINTS}
${buildStyleBlock(style)}

INPUT:
- item: ${JSON.stringify(item)}
- feedback: ${JSON.stringify(feedback)}
- transcript: (for quotes or specifics) """${transcript}"""
- tone: ${tone ?? "engaging"}

TASK:
1) Edit item.content to address the "fix_suggestion".
2) Ensure NO hashtags, NO emojis, NO em-dashes.
3) Keep ≤280 chars.
4) Preserve the original "id" field.

OUTPUT:
Return a single JSON object with this schema:
{
  "id": "<same id as input>",
  "content": "improved text",
  "charCount": 140
}

Return ONLY JSON. No prose.
`;

// Style analysis prompt for analyzing example tweets
export const styleAnalysisPrompt = ({
  exampleTweets,
}: {
  exampleTweets: string[];
}) => `
SYSTEM:
You are an expert writing style analyst. Analyze the following example tweets and extract the writing style characteristics.

EXAMPLE TWEETS:
${exampleTweets.map((tweet, i) => `${i + 1}. "${sanitizePromptInput(tweet)}"`).join("\n")}

ANALYSIS TASK:
Analyze these tweets and identify:
1. Tone (e.g., casual, professional, provocative, educational)
2. Vocabulary patterns (simple vs complex, jargon usage, word choices)
3. Sentence structure (short punchy vs flowing, use of fragments)
4. Hook patterns (how they start tweets, attention-grabbing techniques)
5. Recurring stylistic patterns (lists, questions, bold statements)
6. Overall summary of the writing voice

OUTPUT FORMAT (strict JSON only):
{
  "tone": "description of tone",
  "vocabulary": "description of vocabulary patterns",
  "sentenceStructure": "description of sentence patterns",
  "hooks": "description of hook techniques used",
  "patterns": ["pattern1", "pattern2", "pattern3"],
  "summary": "2-3 sentence summary of the overall writing style"
}

Return ONLY JSON. No extra text.
`;
