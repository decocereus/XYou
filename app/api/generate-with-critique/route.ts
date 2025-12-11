import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import {
  GenerateResponseSchema,
  GeneratedItem,
  GeneratedItemSchema,
} from "@/lib/model-output-schemas";
import { fetchTranscript, validateJson } from "@/lib/agent-tools";
import { criticPrompt, generatorPrompt, refinerPrompt } from "@/lib/prompts";
import { ContentFormatSchema, ToneSchema } from "@/lib/content-types";
import { SegmentSchema } from "@/lib/backend-schemas";
import { openrouter } from "@/lib/openrouter";

// Request validation schema
const GenerateWithCritiqueRequestSchema = z
  .object({
    transcript: z.string().optional(),
    transcriptUrl: z.string().url().optional(),
    segments: SegmentSchema.array().optional(),
    format: ContentFormatSchema,
    tone: ToneSchema.optional(),
    count: z.number().int().positive().max(20).default(6),
  })
  .refine(
    (data) => Boolean(data.transcript || data.transcriptUrl),
    "transcript or transcriptUrl is required"
  );

// OpenRouter model identifiers
const GENERATOR_MODEL =
  process.env.GENERATOR_MODEL || "anthropic/claude-sonnet-4";
const CRITIC_MODEL = process.env.CRITIC_MODEL || "openai/gpt-4o-mini";
const REFINER_MODEL = process.env.REFINER_MODEL || "anthropic/claude-sonnet-4";

// Helper to get the model via OpenRouter
function getModel(modelName: string) {
  return openrouter.chat(modelName);
}

export async function generateWithCritic({
  transcript,
  format = "tweet",
  tone,
  count = 6,
  transcriptUrl,
  segments,
}: {
  transcript?: string;
  transcriptUrl?: string;
  format?: string;
  tone?: string;
  count?: number;
  segments?: { start: number; end: number; text: string }[];
}) {
  if (!transcript) {
    if (!transcriptUrl) throw new Error("transcript or transcriptUrl required");
    transcript = await fetchTranscript(transcriptUrl);
  }

  const segmentsPresent = Boolean(segments?.length);

  // 1) GENERATOR PASS (deterministic)
  const genPrompt = generatorPrompt({
    transcript,
    count,
    tone,
    format,
    segmentsPresent,
  });

  const genResp = await generateText({
    model: getModel(GENERATOR_MODEL),
    prompt: genPrompt,
    temperature: 0,
  });

  // parse generator output (robust)
  let genJson: Record<string, unknown>;
  try {
    const cleaned = stripCodeFence(genResp.text);
    genJson = JSON.parse(cleaned);
  } catch (e) {
    // fallback: treat whole response as one raw item
    console.error("Error parsing generator output:", e);
    genJson = { items: [{ id: "raw-1", content: genResp.text }] };
  }

  // validate and normalize items
  const v = validateJson(GenerateResponseSchema, genJson);

  // Extract items from parsed or raw JSON, then ensure IDs
  let rawItems: GeneratedItem[] = [];
  if (v.ok) {
    rawItems = v.parsed.items;
  } else if (Array.isArray((genJson as { items?: unknown[] })?.items)) {
    // Fallback: extract items even if full schema fails
    rawItems = (
      genJson as {
        items: Array<{ content?: string; charCount?: number; tone?: string }>;
      }
    ).items.map((item) => ({
      content: item.content || "",
      charCount: item.charCount,
      tone: item.tone,
    }));
  }

  // Ensure all items have unique IDs
  const initialItems = ensureItemIds(rawItems);

  // 2) CRITIC PASS — ask critic to score all items
  const criticIn = JSON.stringify(
    initialItems.map((i) => ({ id: i.id ?? "", content: i.content }))
  );
  const criticResp = await generateText({
    model: getModel(CRITIC_MODEL),
    prompt: criticPrompt({ itemsJson: criticIn, transcript }),
    temperature: 0.2,
  });

  type CriticFeedback = {
    id: string;
    ok: boolean;
    score: number;
    issues: string[];
    fix_suggestion: string;
  };

  let criticJson: CriticFeedback[];
  try {
    criticJson = JSON.parse(stripCodeFence(criticResp.text));
  } catch (e) {
    // if critic fails, fall back to simple auto-scorer (heuristic)
    console.error("Error parsing criticJson output:", e);
    criticJson = initialItems.map((i) => ({
      id: i.id || "",
      ok: true,
      score: Math.round(((i.content.length % 10) / 10) * 10),
      issues: [],
      fix_suggestion: "",
    }));
  }

  // 3) REFINEMENT — call refiner per item that critic flagged
  const finalItems: GeneratedItem[] = [];
  for (const item of initialItems) {
    const feedback = criticJson.find((f) => f.id === item.id) ?? null;
    if (!feedback) {
      finalItems.push(item);
      continue;
    }

    const needsRefine = !feedback.ok || feedback.score < 7;
    if (!needsRefine) {
      finalItems.push(item);
      continue;
    }

    // prompt refiner
    const refineResp = await generateText({
      model: getModel(REFINER_MODEL),
      prompt: refinerPrompt({
        item: { id: item.id || "", content: item.content },
        feedback: {
          issues: feedback.issues,
          fix_suggestion: feedback.fix_suggestion,
        },
        transcript,
        tone,
      }),
      temperature: 0.2,
    });

    let refinedObj: unknown;
    try {
      refinedObj = JSON.parse(stripCodeFence(refineResp.text));
    } catch (e) {
      // fallback: keep original
      console.error("Error parsing refinedObj output:", e);
      finalItems.push(item);
      continue;
    }

    // validate single item
    const itemV = validateJson(GeneratedItemSchema, refinedObj);
    if (itemV.ok) finalItems.push(itemV.parsed);
    else finalItems.push(item); // fallback
  }

  const wrapped = {
    items: finalItems,
    pass_meta: {
      generator_model: GENERATOR_MODEL,
      critic_model: CRITIC_MODEL,
      passes: 3,
      timestamp: new Date().toISOString(),
    },
  };

  const finalValidate = validateJson(GenerateResponseSchema, wrapped);
  if (!finalValidate.ok) {
    // return best-effort
    return wrapped;
  }
  return finalValidate.parsed;
}

// Small helper to strip ``` fences
function stripCodeFence(s: string) {
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(s.trim());
  return m ? m[1] : s;
}

// Ensure each item has a unique ID
function ensureItemIds(items: GeneratedItem[]): GeneratedItem[] {
  return items.map((item, idx) => ({
    ...item,
    id: item.id || `item-${idx + 1}`,
  }));
}

// POST handler for the API route
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = GenerateWithCritiqueRequestSchema.parse(body);

    const result = await generateWithCritic({
      transcript: parsed.transcript,
      transcriptUrl: parsed.transcriptUrl,
      format: parsed.format,
      tone: parsed.tone,
      count: parsed.count,
      segments: parsed.segments,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Generate with critique error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to generate content with critique" },
      { status: 400 }
    );
  }
}
