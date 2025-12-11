import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import {
  ContentFormatSchema,
  ToneSchema,
  type GeneratedContentItem,
} from "@/lib/content-types";
import { SegmentSchema } from "@/lib/backend-schemas";
import { buildPrompt } from "@/lib/prompts";
import { openrouter } from "@/lib/openrouter";

// Model configuration
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || "claude-sonnet-4-5";

// Get the right model provider based on model name
function getModel(modelName: string) {
  return openrouter.chat(modelName);
}

const GenerateRequestSchema = z
  .object({
    transcript: z.string().optional(),
    transcriptUrl: z.string().url().optional(),
    segments: SegmentSchema.array().optional(),
    format: ContentFormatSchema,
    tone: ToneSchema.optional(),
    count: z.number().int().positive().max(20).default(3),
  })
  .refine(
    (data) => Boolean(data.transcript || data.transcriptUrl),
    "transcript or transcriptUrl is required"
  );

async function loadTranscript(
  transcript?: string,
  transcriptUrl?: string
): Promise<string> {
  if (transcript) return transcript;
  if (!transcriptUrl) throw new Error("Transcript missing");
  const res = await fetch(transcriptUrl);
  if (!res.ok) throw new Error("Failed to fetch transcript");
  return await res.text();
}

function normalizeItems(
  raw: any,
  format: z.infer<typeof ContentFormatSchema>,
  tone?: z.infer<typeof ToneSchema>
): GeneratedContentItem[] {
  const parsedItems = Array.isArray(raw?.items) ? raw.items : [];
  if (parsedItems.length) {
    return parsedItems.map((item: any, idx: number) => ({
      id: item.id || `item-${idx + 1}`,
      format,
      tone,
      content: item.content || "",
      parts: item.parts,
      charCount:
        typeof item.charCount === "number" ? item.charCount : undefined,
      metadata: item.metadata,
    }));
  }

  // Backwards compatibility for prior prompt structures
  if (format === "thread" && raw?.threads) {
    const entries = Array.isArray(raw.threads)
      ? raw.threads
      : Object.values(raw.threads);
    return entries.map((parts: any, idx: number) => ({
      id: `thread-${idx + 1}`,
      format,
      tone,
      content: Array.isArray(parts) ? parts.join("\n") : String(parts ?? ""),
      parts: Array.isArray(parts) ? parts : undefined,
    }));
  }

  if (format === "tweet" && Array.isArray(raw?.tweets)) {
    return raw.tweets.map((tweet: any, idx: number) => ({
      id: `tweet-${idx + 1}`,
      format,
      tone,
      content: String(tweet ?? ""),
    }));
  }

  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = GenerateRequestSchema.parse(body);
    const transcript = await loadTranscript(
      parsed.transcript,
      parsed.transcriptUrl
    );

    const prompt = buildPrompt({
      format: parsed.format,
      transcript,
      segments: parsed.segments,
      tone: parsed.tone,
      count: parsed.count,
    });

    const { text } = await generateText({
      model: getModel(GENERATOR_MODEL),
      prompt,
      temperature: parsed?.format === "shorts" ? 0.4 : 0.2,
    });

    let json: any = null;
    try {
      let cleanedText = text.trim();
      const codeBlockMatch = new RegExp(
        /^```(?:json)?\s*([\s\S]*?)\s*```$/
      ).exec(cleanedText);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1];
      }
      json = JSON.parse(cleanedText);
    } catch {}

    const items = normalizeItems(json, parsed.format, parsed.tone);
    if (items.length) {
      return NextResponse.json({ items });
    }

    const fallback: GeneratedContentItem = {
      id: "raw-1",
      format: parsed.format,
      tone: parsed.tone,
      content: text,
    };
    return NextResponse.json({ items: [fallback], raw: text });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to generate content" },
      { status: 400 }
    );
  }
}
