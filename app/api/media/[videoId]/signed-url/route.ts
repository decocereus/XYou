import { NextResponse } from "next/server";
import { MediaSignedUrlResponseSchema } from "@/lib/backend-schemas";
import { z } from "zod";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.API_KEY;

type Params = { videoId: string };

const BodySchema = z.object({
  mediaType: z.enum(["video", "audio"]),
  quality: z.enum(["2160p", "1440p", "1080p", "720p", "best"]).optional(),
});

export async function POST(
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

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const res = await fetch(
    `${BACKEND_URL}/media/${encodeURIComponent(videoId)}/signed-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(parsed.data),
    }
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore parse failures and fall back to text error
  }

  if (!res.ok) {
    return NextResponse.json(
      json && typeof json === "object"
        ? json
        : { error: text || "signed_url_failed" },
      { status: res.status }
    );
  }

  const validated = MediaSignedUrlResponseSchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(
      { error: "signed_url_failed", raw: json ?? text },
      { status: 500 }
    );
  }

  return NextResponse.json(validated.data, { status: res.status });
}
