import { NextResponse } from "next/server";
import {
  TranscribeRequestSchema,
  TranscribeSubtitlesResponseSchema,
  TranscribeTranscriptResponseSchema,
} from "@/lib/backend-schemas";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.API_KEY;

const UNSUPPORTED_URL_MESSAGE =
  "unsupported url; must be a signed GCS https url";

export async function POST(req: Request) {
  if (!BACKEND_URL || !API_KEY) {
    return NextResponse.json(
      { error: "Backend not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = TranscribeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ||
      (parsed.error.message.includes("unsupported url")
        ? UNSUPPORTED_URL_MESSAGE
        : "invalid request");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const format = parsed.data.formatAs ?? "transcript";
  const schema =
    format === "subtitles"
      ? TranscribeSubtitlesResponseSchema
      : TranscribeTranscriptResponseSchema;

  const res = await fetch(`${BACKEND_URL}/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(parsed.data),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // fall back to text error handling
  }

  if (!res.ok) {
    return NextResponse.json(
      json && typeof json === "object"
        ? json
        : { error: text || "transcription_failed" },
      { status: res.status }
    );
  }

  const validated = schema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(
      { error: "transcription_failed", raw: json ?? text },
      { status: 500 }
    );
  }

  return NextResponse.json(validated.data, { status: res.status });
}
