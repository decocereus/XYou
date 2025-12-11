import { generateText, type Tool } from "ai";
import { z } from "zod";

import {
  styleAnalysisPrompt,
  generatorPrompt,
  criticPrompt,
  refinerPrompt,
  buildScriptPrompt,
  type AnalyzedStyle,
} from "./prompts";
import {
  sanitizePromptInputArray,
  sanitizePurposeInput,
} from "./prompt-sanitizer";
import { openrouter } from "./openrouter";

// Model configuration from environment
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || "claude-sonnet-4-5";
const CRITIC_MODEL = process.env.CRITIC_MODEL || "gpt-4o-mini";

// Get the right model provider based on model name
function getModel(modelName: string) {
  return openrouter.chat(modelName);
}

// Helper to strip code fences from model output
function stripCodeFence(s: string): string {
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(s.trim());
  return m ? m[1] : s;
}

// Style schema for validation
const StyleSchema = z.object({
  tone: z.string(),
  vocabulary: z.string(),
  sentenceStructure: z.string(),
  hooks: z.string(),
  patterns: z.array(z.string()),
  summary: z.string(),
});

// ============================================================================
// TOOL: Analyze Writing Style
// ============================================================================
export const analyzeWritingStyleTool: Tool = {
  description:
    "Analyze 5-10 example tweets to extract the writing style characteristics. Returns a style profile that can be used for content generation.",
  inputSchema: z.object({
    exampleTweets: z
      .array(z.string())
      .min(3)
      .max(15)
      .describe("Array of 5-10 example tweets to analyze for style"),
  }),
  execute: async ({
    exampleTweets,
  }: {
    exampleTweets: string[];
  }): Promise<AnalyzedStyle> => {
    const sanitizedTweets = sanitizePromptInputArray(exampleTweets, {
      maxLength: 500,
      maxItems: 15,
    });

    if (sanitizedTweets.length < 3) {
      throw new Error("Need at least 3 example tweets to analyze style");
    }

    const prompt = styleAnalysisPrompt({ exampleTweets: sanitizedTweets });

    const result = await generateText({
      model: getModel(GENERATOR_MODEL),
      prompt,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(
        stripCodeFence(result.text)
      ) as Partial<AnalyzedStyle>;
      return {
        tone: parsed.tone || "engaging",
        vocabulary: parsed.vocabulary || "varied",
        sentenceStructure: parsed.sentenceStructure || "mixed",
        hooks: parsed.hooks || "direct statements",
        patterns: parsed.patterns || [],
        summary: parsed.summary || "No summary available",
      };
    } catch {
      return {
        tone: "engaging",
        vocabulary: "varied",
        sentenceStructure: "mixed",
        hooks: "direct statements",
        patterns: [],
        summary: "Style analysis incomplete - using default patterns",
      };
    }
  },
};

// ============================================================================
// TOOL: Generate Tweets
// ============================================================================
export const generateTweetsTool: Tool = {
  description:
    "Generate tweets from a transcript or text source, optionally using a specific writing style.",
  inputSchema: z.object({
    transcript: z
      .string()
      .describe("The source transcript or text to generate tweets from"),
    count: z
      .number()
      .min(1)
      .max(20)
      .default(6)
      .describe("Number of tweets to generate"),
    tone: z
      .string()
      .optional()
      .describe("Desired tone (e.g., viral, professional, casual)"),
    style: StyleSchema.optional().describe("Writing style profile to emulate"),
    purpose: z
      .string()
      .optional()
      .describe("Purpose of the tweets (e.g., affiliate marketing)"),
  }),
  execute: async ({
    transcript,
    count,
    tone,
    style,
    purpose,
  }: {
    transcript: string;
    count?: number;
    tone?: string;
    style?: z.infer<typeof StyleSchema>;
    purpose?: string;
  }) => {
    const prompt = generatorPrompt({
      transcript,
      count: count ?? 6,
      tone,
      format: "tweet",
      segmentsPresent: false,
      style,
      purpose: purpose ? sanitizePurposeInput(purpose) : undefined,
    });

    const result = await generateText({
      model: getModel(GENERATOR_MODEL),
      prompt,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(stripCodeFence(result.text)) as {
        items?: Array<{ content?: string }>;
      };
      return {
        items: (parsed.items || []).map((item, idx) => ({
          id: `tweet-${idx + 1}`,
          content: item.content || "",
          charCount: (item.content || "").length,
        })),
      };
    } catch {
      return {
        items: [] as Array<{ id: string; content: string; charCount: number }>,
        error: "Failed to parse generated content",
      };
    }
  },
};

// ============================================================================
// TOOL: Generate Script
// ============================================================================
export const generateScriptTool: Tool = {
  description:
    "Generate a script on a new topic using the style extracted from a reference transcript.",
  inputSchema: z.object({
    referenceTranscript: z
      .string()
      .describe("The transcript to use as a style reference"),
    topic: z.string().describe("The topic for the new script"),
    style: StyleSchema.optional().describe(
      "Optional pre-analyzed style profile"
    ),
    purpose: z.string().optional().describe("Purpose of the script"),
  }),
  execute: async ({
    referenceTranscript,
    topic,
    style,
    purpose,
  }: {
    referenceTranscript: string;
    topic: string;
    style?: z.infer<typeof StyleSchema>;
    purpose?: string;
  }) => {
    const prompt = buildScriptPrompt({
      transcript: referenceTranscript,
      topic: sanitizePurposeInput(topic),
      style,
      purpose: purpose ? sanitizePurposeInput(purpose) : undefined,
    });

    const result = await generateText({
      model: getModel(GENERATOR_MODEL),
      prompt,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(stripCodeFence(result.text)) as {
        script?: string;
        styleNotes?: string;
      };
      return {
        script: parsed.script || result.text,
        styleNotes: parsed.styleNotes || "Style matching attempted",
      };
    } catch {
      return {
        script: result.text,
        styleNotes: "Output format error - returning raw script",
      };
    }
  },
};

// ============================================================================
// TOOL: Critique Content
// ============================================================================
export const critiqueContentTool: Tool = {
  description:
    "Critique generated content items and provide scores and improvement suggestions. Uses a fast model for efficiency.",
  inputSchema: z.object({
    items: z
      .array(
        z.object({
          id: z.string(),
          content: z.string(),
        })
      )
      .describe("Array of content items to critique"),
    transcript: z.string().describe("Original transcript for context"),
  }),
  execute: async ({
    items,
    transcript,
  }: {
    items: Array<{ id: string; content: string }>;
    transcript: string;
  }) => {
    const itemsJson = JSON.stringify(
      items.map((i) => ({ id: i.id, content: i.content }))
    );

    const prompt = criticPrompt({ itemsJson, transcript });

    const result = await generateText({
      model: getModel(CRITIC_MODEL),
      prompt,
      temperature: 0.2,
    });

    type CriticResult = {
      id?: string;
      ok?: boolean;
      score?: number;
      issues?: string[];
      fix_suggestion?: string;
    };

    try {
      const parsed = JSON.parse(stripCodeFence(result.text)) as CriticResult[];
      return {
        critiques: Array.isArray(parsed)
          ? parsed.map((c) => ({
              id: c.id || "",
              ok: c.ok ?? (c.score ?? 0) >= 7,
              score: c.score ?? 5,
              issues: c.issues || [],
              fixSuggestion: c.fix_suggestion || "",
            }))
          : [],
      };
    } catch {
      return {
        critiques: items.map((i) => ({
          id: i.id,
          ok: true,
          score: 6,
          issues: [] as string[],
          fixSuggestion: "",
        })),
      };
    }
  },
};

// ============================================================================
// TOOL: Refine Content
// ============================================================================
export const refineContentTool: Tool = {
  description: "Refine a single content item based on critic feedback.",
  inputSchema: z.object({
    item: z
      .object({
        id: z.string(),
        content: z.string(),
      })
      .describe("The content item to refine"),
    feedback: z
      .object({
        issues: z.array(z.string()),
        fixSuggestion: z.string(),
      })
      .describe("Feedback from the critic"),
    transcript: z.string().describe("Original transcript for context"),
    tone: z.string().optional().describe("Desired tone"),
    style: StyleSchema.optional().describe("Writing style profile"),
  }),
  execute: async ({
    item,
    feedback,
    transcript,
    tone,
    style,
  }: {
    item: { id: string; content: string };
    feedback: { issues: string[]; fixSuggestion: string };
    transcript: string;
    tone?: string;
    style?: z.infer<typeof StyleSchema>;
  }) => {
    const prompt = refinerPrompt({
      item,
      feedback: {
        issues: feedback.issues,
        fix_suggestion: feedback.fixSuggestion,
      },
      transcript,
      tone,
      style,
    });

    const result = await generateText({
      model: getModel(GENERATOR_MODEL),
      prompt,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(stripCodeFence(result.text)) as {
        id?: string;
        content?: string;
      };
      return {
        id: parsed.id || item.id,
        content: parsed.content || item.content,
        charCount: (parsed.content || item.content).length,
        refined: true,
      };
    } catch {
      return {
        id: item.id,
        content: item.content,
        charCount: item.content.length,
        refined: false,
      };
    }
  },
};

// ============================================================================
// TOOL: Fetch Transcript (for external URLs)
// ============================================================================
export const fetchTranscriptTool: Tool = {
  description: "Fetch a transcript from a URL or the internal API.",
  inputSchema: z.object({
    transcriptUrl: z
      .string()
      .url()
      .describe("URL to fetch the transcript from"),
  }),
  execute: async ({ transcriptUrl }: { transcriptUrl: string }) => {
    const res = await fetch(transcriptUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch transcript: ${res.status}`);
    }
    const text = await res.text();
    return { text, length: text.length };
  },
};

// Legacy exports for backward compatibility
export async function webSearch(query: string, limit = 3) {
  const hits = [
    { title: "Example result", url: "https://example.com", snippet: "..." },
  ];
  return hits.slice(0, limit);
}

export async function fetchTranscript(transcriptUrl: string) {
  const res = await fetch(transcriptUrl);
  if (!res.ok) throw new Error("Failed to fetch transcript");
  return await res.text();
}

export function validateJson<T>(
  schema: z.ZodSchema<T>,
  raw: unknown
): { ok: true; parsed: T } | { ok: false; error: unknown } {
  try {
    const parsed = schema.parse(raw);
    return { ok: true, parsed };
  } catch (e: unknown) {
    const error = e as { errors?: unknown[]; message?: string };
    return { ok: false, error: error.errors ?? error.message };
  }
}

// Export all tools as a collection
export const contentAgentTools = {
  analyzeWritingStyle: analyzeWritingStyleTool,
  generateTweets: generateTweetsTool,
  generateScript: generateScriptTool,
  critiqueContent: critiqueContentTool,
  refineContent: refineContentTool,
  fetchTranscript: fetchTranscriptTool,
};
