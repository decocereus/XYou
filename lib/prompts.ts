import type { Segment } from "./backend-schemas";

export function buildThreadPrompt({
	transcript,
	segments,
}: {
	transcript: string;
	segments?: Segment[];
}) {
	const tsNote = segments?.length
		? "You have timestamped segments; you may reference moments like [mm:ss] when it helps clarity."
		: "No timestamps available; avoid time references.";
	return `
You are turning a video transcript into Twitter threads.

${tsNote}

Transcript:
${transcript}

Generate:
- A concise bullet summary (3-6 bullets).
- 4 thread styles: viral, educational, actionable, founder/story.
- Each thread: 5-10 tweets, each under 280 characters.
- Include 1-2 strong hooks per thread.
- Be specific and concrete; avoid fluff.

Return strict JSON:
{
  "summary": ["bullet1", "bullet2", ...],
  "threads": {
    "viral": ["tweet1", "tweet2", ...],
    "educational": [...],
    "actionable": [...],
    "founder": [...]
  }
}
`;
}

