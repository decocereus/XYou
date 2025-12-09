import type { Segment } from "./backend-schemas";
import type { Tone } from "./content-types";

type PromptInput = {
  transcript: string;
  segments?: Segment[];
  tone?: Tone;
  count?: number;
};

const toneLine = (tone?: Tone) =>
  tone ? `Tone: ${tone}.` : "Tone: keep it concise and engaging.";

const timestampNote = (segments?: Segment[]) =>
  segments?.length
    ? "You have timestamped segments; you may reference moments like [mm:ss] when it helps clarity."
    : "No timestamps available; avoid time references.";

export function buildTweetPrompt({
  transcript,
  segments,
  tone,
  count = 6,
}: PromptInput) {
  return `
Turn the following transcript into ${count} high-signal tweets.
${toneLine(tone)}
${timestampNote(segments)}

Rules:
- Keep each tweet under 280 characters.
- Use hooks, specificity, and avoid fluff.
- No numbered threads. Each item is an independent tweet.
- Include 0-2 relevant hashtags only if they add clarity.

Transcript:
${transcript}

Return strict JSON:
{
  "items": [
    { "content": "tweet text" }
  ]
}
`;
}

export function buildThreadPrompt({
  transcript,
  segments,
  tone,
  count = 3,
}: PromptInput) {
  return `
Create ${count} Twitter threads from this transcript.
${toneLine(tone)}
${timestampNote(segments)}

Thread rules:
- Each thread 5-10 tweets.
- Hook -> body -> CTA flow.
- Each tweet < 280 characters.
- Use quotes and specifics from the transcript.

Transcript:
${transcript}

Return strict JSON:
{
  "items": [
    { "parts": ["tweet1", "tweet2", "..."] }
  ]
}
`;
}

export function buildLinkedInPrompt({
  transcript,
  segments,
  tone,
  count = 3,
}: PromptInput) {
  return `
Generate ${count} LinkedIn posts from this transcript.
${toneLine(tone)}
${timestampNote(segments)}

Post recipe:
- Hook line (one sentence).
- 2-4 concrete insights or steps.
- Close with a takeaway or question.
- Add 2-4 relevant hashtags (no hashtag stuffing).

Transcript:
${transcript}

Return strict JSON:
{
  "items": [
    { "content": "LinkedIn post text" }
  ]
}
`;
}

export function buildShortsPrompt({
  transcript,
  segments,
  tone,
  count = 3,
}: PromptInput) {
  return `
Write ${count} short-form video scripts (30-60s) for TikTok/Shorts based on the transcript.
${toneLine(tone)}
${timestampNote(segments)}

Script structure:
- Hook (3s)
- Body with 3-5 beats (20-40s) — add visual cues in [brackets]
- CTA (5s)

Transcript:
${transcript}

Return strict JSON:
{
  "items": [
    { "content": "script with cues" }
  ]
}
`;
}
