import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.API_KEY;

type JobParams = { id: string };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: JobParams } | { params: Promise<JobParams> }
) {
  if (!BACKEND_URL || !API_KEY) {
    return NextResponse.json(
      { error: "Backend not configured" },
      { status: 500 }
    );
  }

  const resolvedParams = await Promise.resolve(context.params);
  const id = resolvedParams?.id;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const controller = new AbortController();
  req.signal?.addEventListener("abort", () => controller.abort());

  let upstream: Response;
  try {
    upstream = await fetch(
      `${BACKEND_URL}/jobs/${encodeURIComponent(id)}/stream`,
      {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${API_KEY}`,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "stream_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!upstream.ok || !upstream.body) {
    const text = upstream.body ? await upstream.text() : "";
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // fall through to raw text error
    }

    return NextResponse.json(
      json && typeof json === "object"
        ? json
        : { error: text || "stream_failed" },
      { status: upstream.status }
    );
  }

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
