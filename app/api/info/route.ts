import { NextResponse } from "next/server";
import { AllowedUrlSchema, InfoResponseSchema } from "@/lib/backend-schemas";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.API_KEY;

console.log("BACKEND_URL", BACKEND_URL);

export async function GET(req: Request) {
  if (!BACKEND_URL || !API_KEY) {
    return NextResponse.json(
      { error: "Backend not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const urlCheck = AllowedUrlSchema.safeParse(url);
  if (!urlCheck.success) {
    const message = urlCheck.error.issues[0]?.message || "invalid url";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const res = await fetch(
    `${BACKEND_URL}/info?url=${encodeURIComponent(urlCheck.data)}`,
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
    // leave json as null so we can fall back to a plain error
  }

  if (!res.ok) {
    return NextResponse.json(
      json && typeof json === "object"
        ? json
        : { error: text || "info_failed" },
      { status: res.status }
    );
  }

  const parsed = InfoResponseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "info_failed", raw: json ?? text },
      { status: 500 }
    );
  }

  return NextResponse.json(parsed.data, { status: res.status });
}
