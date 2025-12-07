"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useIngestJob } from "@/lib/useIngestJob";
import type { IngestRequest } from "@/lib/backend-schemas";

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
  downloadTranscript: () => void;
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

  const canSubmit = useMemo(
    () => url.trim().length > 0 && !genLoading,
    [url, genLoading]
  );

  const submitIngest = useCallback(async () => {
    setThreads(null);
    setGenError(null);
    await submit({
      url,
      quality,
      audioOnly: true,
      downloadVideo: false,
      gcsGzip: true,
      gcsValidation: false,
      gcsChunkSizeMb: 8,
      gcsResumable: false,
      remuxToMp4: false,
    });
  }, [submit, url, quality]);

  const generateThreads = useCallback(async () => {
    if (!job?.transcript?.signedUrl) {
      setGenError("Transcript not available yet.");
      return;
    }
    setGenError(null);
    setGenLoading(true);
    try {
      const res = await fetch("/api/generate-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptUrl: job.transcript.signedUrl,
          segments: job.transcript.segments,
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
  }, [job?.transcript?.signedUrl, job?.transcript?.segments]);

  const downloadTranscript = useCallback(() => {
    const transcriptUrl = job?.transcript?.signedUrl;
    if (!transcriptUrl) return;

    const link = document.createElement("a");
    link.href = transcriptUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.download = "transcript.txt";
    link.click();
  }, [job?.transcript?.signedUrl]);

  const resetThreads = useCallback(() => {
    setThreads(null);
    setGenError(null);
  }, []);

  useEffect(() => {
    if (status === "success" && jobId) {
      fetchJobStatus(jobId);
    }
  }, [jobId, status]);

  useEffect(() => {
    if (status === "success" && job?.id && job?.media?.signedUrl) {
      startTranscription({
        url: job.media.signedUrl,
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
      info,
      job,
      progress,
      quality,
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
