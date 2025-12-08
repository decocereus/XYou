import { NextResponse } from "next/server";
import {
  TranscribeSubtitlesResponseSchema,
  TranscribeTranscriptResponseSchema,
} from "@/lib/backend-schemas";
import { z } from "zod";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.API_KEY;

type Params = { videoId: string };

export async function GET(
  req: Request,
  context: { params: Params } | { params: Promise<Params> }
) {
  if (!BACKEND_URL || !API_KEY) {
    return NextResponse.json(
      { error: "Backend not configured" },
      { status: 500 }
    );
  }

  const resolvedParams = await Promise.resolve(context.params);
  const videoId = resolvedParams?.videoId;
  if (!videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "transcript";
  const FormatSchema = z.enum(["transcript", "subtitles"]);
  const formatCheck = FormatSchema.safeParse(format);
  if (!formatCheck.success) {
    return NextResponse.json({ error: "invalid format" }, { status: 400 });
  }

  const res = await fetch(
    `${BACKEND_URL}/transcript/${encodeURIComponent(
      videoId
    )}?format=${encodeURIComponent(formatCheck.data)}`,
    {
      method: "GET",
      headers: {
        "x-api-key": API_KEY,
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: "no-store",
    }
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // fall back to raw text
  }

  if (!res.ok) {
    return NextResponse.json(
      json && typeof json === "object"
        ? json
        : { error: text || "transcript_failed" },
      { status: res.status }
    );
  }

  const schema =
    formatCheck.data === "subtitles"
      ? TranscribeSubtitlesResponseSchema
      : TranscribeTranscriptResponseSchema;
  const validated = schema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(
      { error: "transcript_failed", raw: json ?? text },
      { status: 500 }
    );
  }

  return NextResponse.json(validated.data, { status: res.status });
}
