import { NextResponse } from "next/server";
import { generateText } from "ai";
import { buildThreadPrompt } from "@/lib/prompts";
import { SegmentSchema } from "@/lib/backend-schemas";
import { openrouter } from "@/lib/openrouter";

// Model configuration
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || "claude-sonnet-4-5";

// Get the right model provider based on model name
function getModel(modelName: string) {
  return openrouter.chat(modelName);
}

async function loadTranscript(transcript?: string, transcriptUrl?: string) {
  if (transcript) return transcript;
  if (!transcriptUrl) throw new Error("No transcript provided");
  const res = await fetch(transcriptUrl);
  if (!res.ok) throw new Error("Failed to fetch transcript");
  return await res.text();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const segments = body.segments
      ? SegmentSchema.array().parse(body.segments)
      : undefined;
    const transcript = await loadTranscript(
      body.transcript as string | undefined,
      body.transcriptUrl as string | undefined
    );

    const prompt = buildThreadPrompt({ transcript, segments });

    const { text } = await generateText({
      model: getModel(GENERATOR_MODEL),
      prompt,
      temperature: 0.2,
    });

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    return NextResponse.json({ result: parsed });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to generate threads" },
      { status: 400 }
    );
  }
}
