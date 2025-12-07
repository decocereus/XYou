import { NextResponse } from "next/server";
import {
  IngestRequestSchema,
  IngestResponseSchema,
} from "@/lib/backend-schemas";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.API_KEY;

export async function POST(req: Request) {
  if (!BACKEND_URL || !API_KEY) {
    return NextResponse.json(
      { error: "Backend not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = IngestRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const res = await fetch(`${BACKEND_URL}/ingest`, {
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
    // fall through to error fallback
  }

  if (!res.ok) {
    return NextResponse.json(
      json && typeof json === "object"
        ? json
        : { error: text || "ingest_failed" },
      { status: res.status }
    );
  }

  const parsedResponse = IngestResponseSchema.safeParse(json);
  if (!parsedResponse.success) {
    return NextResponse.json(
      { error: "ingest_failed", raw: json ?? text },
      { status: 500 }
    );
  }

  return NextResponse.json(parsedResponse.data, { status: res.status });
}
