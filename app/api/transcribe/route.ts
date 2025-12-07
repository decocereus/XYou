import { spawn } from "node:child_process";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  TranscribeRequestSchema,
  TranscribeSubtitlesResponseSchema,
  TranscribeTranscriptResponseSchema,
  type TranscribedSegment,
} from "@/lib/backend-schemas";
import { whopsdk } from "@/lib/whop-sdk";

export const runtime = "nodejs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FFMPEG_BINARY = process.env.FFMPEG_BINARY || "ffmpeg";

const UNSUPPORTED_URL_MESSAGE =
  "unsupported url; must be a signed GCS https url";

async function ensureAuthenticated() {
  try {
    const headerList = await headers();
    await whopsdk.verifyUserToken(headerList);
    return true;
  } catch {
    return false;
  }
}

async function transcodeToWav(inputUrl: string) {
  return await new Promise<Buffer>((resolve, reject) => {
    const stderrChunks: string[] = [];
    const stdoutChunks: Buffer[] = [];

    const ffmpeg = spawn(
      FFMPEG_BINARY,
      [
        "-i",
        inputUrl,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "wav",
        "pipe:1",
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    ffmpeg.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    ffmpeg.stderr.on("data", (chunk: Buffer) =>
      stderrChunks.push(chunk.toString())
    );
    ffmpeg.on("error", (err) => reject(err));
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks));
        return;
      }
      const errorMsg =
        stderrChunks.join("").trim() ||
        `ffmpeg exited with code ${code ?? "unknown"}`;
      reject(new Error(errorMsg));
    });
  });
}

async function callWhisper(wav: Buffer, language?: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const form = new FormData();
  const audioBuffer = wav.buffer.slice(
    wav.byteOffset,
    wav.byteOffset + wav.byteLength
  ) as ArrayBuffer;
  form.append(
    "file",
    new File([audioBuffer], "audio.wav", { type: "audio/wav" })
  );
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  if (language) form.append("language", language);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore parse failures; fall back to text
  }

  if (!res.ok) {
    const errorMessage =
      json?.error?.message || json?.error || text || "transcription_failed";
    throw new Error(errorMessage);
  }

  return json;
}

function normalizeSegments(json: any): TranscribedSegment[] {
  if (!Array.isArray(json?.segments)) return [];

  return json.segments
    .map((segment: any) => {
      if (
        typeof segment?.start !== "number" ||
        typeof segment?.end !== "number" ||
        typeof segment?.text !== "string"
      ) {
        return null;
      }

      const words = Array.isArray(segment.words)
        ? segment.words
            .map((word: any) => {
              if (
                typeof word?.start !== "number" ||
                typeof word?.end !== "number"
              ) {
                return null;
              }
              const text = word?.text ?? word?.word;
              if (typeof text !== "string") return null;
              return { start: word.start, end: word.end, text };
            })
            .filter(Boolean)
        : undefined;

      return {
        id: typeof segment.id === "number" ? segment.id : undefined,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        words,
      };
    })
    .filter(Boolean) as TranscribedSegment[];
}

export async function POST(req: Request) {
  const authed = await ensureAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const { url, formatAs, language } = parsed.data;

  try {
    const wav = await transcodeToWav(url);
    const whisperJson = await callWhisper(wav, language);
    const segments = normalizeSegments(whisperJson);

    if (formatAs === "subtitles") {
      const parsedResponse = TranscribeSubtitlesResponseSchema.safeParse({
        segments,
      });
      if (!parsedResponse.success) {
        throw new Error("transcription_failed");
      }
      return NextResponse.json(parsedResponse.data, { status: 200 });
    }

    const payload = {
      text: typeof whisperJson?.text === "string" ? whisperJson.text : "",
      language:
        typeof whisperJson?.language === "string"
          ? whisperJson.language
          : undefined,
      duration:
        typeof whisperJson?.duration === "number"
          ? whisperJson.duration
          : undefined,
      segments,
    };
    const parsedResponse =
      TranscribeTranscriptResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      throw new Error("transcription_failed");
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: any) {
    const message =
      error?.message === UNSUPPORTED_URL_MESSAGE
        ? UNSUPPORTED_URL_MESSAGE
        : "transcription_failed";
    console.error("Transcription failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
