import { NextRequest, NextResponse } from "next/server";
import { JobStatusSchema } from "@/lib/backend-schemas";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.API_KEY;

type JobParams = { id: string };

export async function GET(
  _req: NextRequest,
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

  const res = await fetch(`${BACKEND_URL}/jobs/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      "x-api-key": API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // leave as null so we can fall back to a string error
  }

  if (!res.ok) {
    return NextResponse.json(
      json && typeof json === "object" ? json : { error: text || "job_failed" },
      { status: res.status }
    );
  }

  const parsed = JobStatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid job payload", raw: json ?? text },
      { status: 500 }
    );
  }

  return NextResponse.json(parsed.data, { status: res.status });
}
