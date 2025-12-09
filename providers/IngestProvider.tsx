"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIngestJob } from "@/lib/useIngestJob";
import type { IngestRequest } from "@/lib/backend-schemas";
import { TranscribeTranscriptResponseSchema } from "@/lib/backend-schemas";
import type {
  ContentFormat,
  GeneratedContentItem,
  Tone,
} from "@/lib/content-types";

export type ThreadResult = {
  summary?: string[];
  threads?: Record<string, string[]>;
  raw?: string;
};

export type TriStateBoolean = boolean | "indeterminate";

const statusColor = (state?: string) => {
  if (!state) return "gray";
  if (["success", "completed", "done"].includes(state)) return "success";
  if (["processing", "pending", "queued", "running"].includes(state))
    return "warning";
  if (["error", "failed"].includes(state)) return "danger";
  return "gray";
};

type IngestContextValue = {
  url: string;
  quality: IngestRequest["quality"];
  setUrl: (value: string) => void;
  setQuality: (value: IngestRequest["quality"]) => void;
  canSubmit: boolean;
  submitIngest: () => Promise<void>;
  job: ReturnType<typeof useIngestJob>["job"];
  status: ReturnType<typeof useIngestJob>["status"];
  info: ReturnType<typeof useIngestJob>["info"];
  progress: ReturnType<typeof useIngestJob>["progress"];
  transcript: ReturnType<typeof useIngestJob>["transcript"];
  transcriptStatus: ReturnType<typeof useIngestJob>["transcriptStatus"];
  transcriptError: ReturnType<typeof useIngestJob>["transcriptError"];
  threads: ThreadResult | null;
  genError: string | null;
  genLoading: boolean;
  generateThreads: () => Promise<void>;
  generatedContent: GeneratedContentItem[];
  genContentError: string | null;
  genContentLoading: boolean;
  generateContent: (opts: {
    format: ContentFormat;
    tone: Tone;
    count: number;
  }) => Promise<void>;
  regenerateContent: (id: string) => Promise<void>;
  resetGeneratedContent: () => void;
  downloadTranscript: () => Promise<void>;
  resetThreads: () => void;
  statusColor: typeof statusColor;
};

const IngestContext = createContext<IngestContextValue | null>(null);

export function IngestProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const {
    submit,
    job,
    jobId,
    status,
    info,
    progress,
    transcript,
    transcriptStatus,
    transcriptError,
    fetchJobStatus,
    startTranscription,
  } = useIngestJob();

  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState<IngestRequest["quality"]>("best");
  const [threads, setThreads] = useState<ThreadResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<
    GeneratedContentItem[]
  >([]);
  const [genContentError, setGenContentError] = useState<string | null>(null);
  const [genContentLoading, setGenContentLoading] = useState(false);
  const lastGenerationRef = useRef<{
    format: ContentFormat;
    tone: Tone;
    count: number;
  } | null>(null);
  const jobStatusFetchedRef = useRef<string | null>(null);

  const canSubmit = useMemo(
    () => url.trim().length > 0 && !genLoading && !genContentLoading,
    [url, genContentLoading, genLoading]
  );

  const submitIngest = useCallback(async () => {
    setThreads(null);
    setGenError(null);
    setGeneratedContent([]);
    setGenContentError(null);
    lastGenerationRef.current = null;
    jobStatusFetchedRef.current = null;
    await submit({
      url,
      quality,
      mediaType: "audio",
      audioOnly: true,
      downloadVideo: false,
      preferMp4: true,
      concurrentFragments: 8,
      gcsGzip: true,
      gcsValidation: false,
      gcsChunkSizeMb: 8,
      gcsResumable: false,
      remuxToMp4: false,
    });
  }, [submit, url, quality]);

  const generateThreads = useCallback(async () => {
    setGenError(null);
    setGenLoading(true);
    try {
      let workingTranscript = transcript;

      if (!workingTranscript && job?.id) {
        const res = await fetch(
          `/api/transcript/${encodeURIComponent(job.id)}?format=transcript`
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Transcript not available yet");
        }
        const parsed = TranscribeTranscriptResponseSchema.parse(json);
        workingTranscript = parsed;
      }

      if (!workingTranscript) {
        throw new Error("Transcript not available yet.");
      }

      const res = await fetch("/api/generate-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: workingTranscript.text,
          segments: workingTranscript.segments,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      setThreads(json.result || json);
    } catch (e: any) {
      setGenError(e?.message || "Failed to generate threads");
    } finally {
      setGenLoading(false);
    }
  }, [job?.id, transcript]);

  const resolveTranscript = useCallback(async () => {
    let workingTranscript = transcript;
    if (!workingTranscript && job?.id) {
      const res = await fetch(
        `/api/transcript/${encodeURIComponent(job.id)}?format=transcript`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Transcript not available yet");
      }
      workingTranscript = TranscribeTranscriptResponseSchema.parse(json);
    }
    if (!workingTranscript) {
      throw new Error("Transcript not available yet.");
    }
    return workingTranscript;
  }, [job?.id, transcript]);

  const generateContent = useCallback(
    async ({
      format,
      tone,
      count,
    }: {
      format: ContentFormat;
      tone: Tone;
      count: number;
    }) => {
      setGenContentError(null);
      setGenContentLoading(true);
      try {
        const workingTranscript = await resolveTranscript();
        const res = await fetch("/api/generate-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: workingTranscript.text,
            segments: workingTranscript.segments,
            format,
            tone,
            count,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Failed to generate content");
        }
        const items = Array.isArray(json.items)
          ? (json.items as GeneratedContentItem[])
          : [];
        setGeneratedContent(items);
        lastGenerationRef.current = { format, tone, count };
      } catch (e: any) {
        setGenContentError(e?.message || "Failed to generate content");
      } finally {
        setGenContentLoading(false);
      }
    },
    [resolveTranscript]
  );

  const regenerateContent = useCallback(
    async (id: string) => {
      const last = lastGenerationRef.current;
      if (!last) {
        setGenContentError("Generate content first");
        return;
      }
      try {
        const workingTranscript = await resolveTranscript();
        const res = await fetch("/api/generate-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: workingTranscript.text,
            segments: workingTranscript.segments,
            format: last.format,
            tone: last.tone,
            count: 1,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Failed to regenerate content");
        }
        const [fresh] = Array.isArray(json.items)
          ? (json.items as GeneratedContentItem[])
          : [];
        if (!fresh) return;
        setGeneratedContent((prev) =>
          prev.map((item) => (item.id === id ? fresh : item))
        );
      } catch (e: any) {
        setGenContentError(e?.message || "Failed to regenerate");
      }
    },
    [resolveTranscript]
  );

  const downloadTranscript = useCallback(async () => {
    let workingTranscript = transcript;

    if (!workingTranscript && job?.id) {
      try {
        const res = await fetch(
          `/api/transcript/${encodeURIComponent(job.id)}?format=transcript`
        );
        const json = await res.json();
        if (res.ok) {
          workingTranscript = TranscribeTranscriptResponseSchema.parse(json);
        }
      } catch (e) {
        console.error("Failed to fetch transcript", e);
      }
    }

    const content =
      workingTranscript?.text ||
      workingTranscript?.segments?.map((seg) => seg.text).join("\n") ||
      "";
    if (!content) return;

    const blob = new Blob([content], { type: "text/plain" });
    const urlObj = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = urlObj;
    link.download = "transcript.txt";
    link.click();
    URL.revokeObjectURL(urlObj);
  }, [job?.id, transcript]);

  const resetThreads = useCallback(() => {
    setThreads(null);
    setGenError(null);
  }, []);

  const resetGeneratedContent = useCallback(() => {
    setGeneratedContent([]);
    setGenContentError(null);
    lastGenerationRef.current = null;
  }, []);

  useEffect(() => {
    if (
      status === "success" &&
      jobId &&
      jobStatusFetchedRef.current !== jobId
    ) {
      jobStatusFetchedRef.current = jobId;
      fetchJobStatus(jobId);
    }
  }, [fetchJobStatus, jobId, status]);

  useEffect(() => {
    if (status === "success" && job?.id) {
      startTranscription({
        videoId: job.videoId || job.id,
        mediaType: job.media?.mediaType ?? "audio",
        formatAs: "transcript",
      });
    }
  }, [job, startTranscription, status]);

  const value = useMemo(
    () => ({
      url,
      quality,
      setUrl,
      setQuality,
      canSubmit,
      submitIngest,
      job,
      status,
      info,
      progress,
      transcript,
      transcriptStatus,
      transcriptError,
      threads,
      genError,
      genLoading,
      generateThreads,
      generatedContent,
      genContentError,
      genContentLoading,
      generateContent,
      regenerateContent,
      resetGeneratedContent,
      downloadTranscript,
      resetThreads,
      statusColor,
    }),
    [
      canSubmit,
      downloadTranscript,
      genError,
      genLoading,
      generateThreads,
      genContentError,
      genContentLoading,
      generateContent,
      regenerateContent,
      info,
      job,
      progress,
      quality,
      generatedContent,
      resetGeneratedContent,
      resetThreads,
      status,
      submitIngest,
      transcript,
      transcriptError,
      transcriptStatus,
      threads,
      url,
    ]
  );

  return (
    <IngestContext.Provider value={value}>{children}</IngestContext.Provider>
  );
}

export function useIngest() {
  const ctx = useContext(IngestContext);
  if (!ctx) {
    throw new Error("useIngest must be used within IngestProvider");
  }
  return ctx;
}
