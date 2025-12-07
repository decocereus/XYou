import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import {
  type IngestRequest,
  InfoResponseSchema,
  IngestResponseSchema,
  JobStatusSchema,
  TranscribeTranscriptResponseSchema,
  type TranscribeTranscriptResponse,
} from "./backend-schemas";
import { toast } from "sonner";

type JobStatus = z.infer<typeof JobStatusSchema>;
type Info = z.infer<typeof InfoResponseSchema>;
type ProgressUpdate = {
  bytes?: number;
  mb?: number;
  elapsedMs?: number;
  totalBytes?: number;
  timestamp?: string;
};

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || `Backend error ${res.status}`);
  }
}

const parseSseJson = (data: string) => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export function useIngestJob() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus["status"] | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [transcript, setTranscript] =
    useState<TranscribeTranscriptResponse | null>(null);
  const [transcriptStatus, setTranscriptStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventListenersRef = useRef<{
    status?: (event: MessageEvent) => void;
    progress?: (event: MessageEvent) => void;
  }>({});
  const transcribeStartedForRef = useRef<string | null>(null);

  const clearPolling = () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
  };

  const closeStream = () => {
    if (eventSourceRef.current) {
      const { status, progress } = eventListenersRef.current;
      if (status) {
        eventSourceRef.current.removeEventListener("status", status);
      }
      if (progress) {
        eventSourceRef.current.removeEventListener("progress", progress);
      }
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      eventListenersRef.current = {};
    }
  };

  const fetchJobStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
      const payload = await readJson(res);

      if (!res.ok) {
        throw new Error(payload?.error || "Job polling failed");
      }

      const parsed = JobStatusSchema.parse(payload);
      console.log("PARSED JOB DATA", parsed);
      setJob(parsed);
      setStatus(parsed.status);
      return parsed;
    } catch (error) {
      console.error("Error polling Job", error);
      toast.error((error as Error)?.message || "Job polling failed");
    }
  };

  const poll = useCallback(async (id: string, attempt = 0) => {
    try {
      const res = await fetchJobStatus(id);

      if (!res) {
        toast.error("Failed to poll job");
        return;
      }

      if (res.status === "pending" || res.status === "running") {
        const delay = Math.min(
          15000,
          1000 * 2 ** Math.min(attempt, 4) // 1s -> 2 -> 4 -> 8 -> 16 capped at 15s
        );
        pollingRef.current = setTimeout(() => poll(id, attempt + 1), delay);
      }
    } catch (e) {
      toast.error((e as Error)?.message || "Job polling failed");
    }
  }, []);

  const startStream = useCallback(
    (id: string) => {
      if (typeof EventSource === "undefined") {
        poll(id, 0);
        return;
      }

      closeStream();
      setProgress(null);

      const source = new EventSource(
        `/api/jobs/${encodeURIComponent(id)}/stream`
      );
      eventSourceRef.current = source;

      const handleStatus = (event: MessageEvent) => {
        const payload = parseSseJson(event.data);
        const jobPayload = payload?.job ?? payload?.data?.job;
        const statusPayload =
          payload?.status ?? payload?.data?.status ?? jobPayload?.status;
        const errorMessage = payload?.error ?? payload?.data?.error;

        if (jobPayload) {
          const parsed = JobStatusSchema.safeParse(jobPayload);
          if (parsed.success) {
            setJob(parsed.data);
            setStatus(parsed.data.status);
          }
        } else if (statusPayload) {
          setStatus(statusPayload);
        }

        if (errorMessage) {
          toast.error(errorMessage);
        }

        if (statusPayload === "success" || statusPayload === "error") {
          source.close();
          eventSourceRef.current = null;
        }
      };

      const handleProgress = (event: MessageEvent) => {
        const payload = parseSseJson(event.data);
        const data = payload?.data ?? payload ?? {};
        const bytes = typeof data?.bytes === "number" ? data.bytes : undefined;
        const inBytes =
          typeof bytes === "number" ? bytes / 1024 / 1024 : undefined;
        const mb = typeof data?.mb === "number" ? data.mb : inBytes;
        const totalBytes =
          typeof data?.totalBytes === "number" ? data.totalBytes : undefined;

        setStatus((prev) => prev ?? "running");
        setProgress({
          bytes,
          mb,
          elapsedMs:
            typeof data?.elapsedMs === "number" ? data.elapsedMs : undefined,
          totalBytes,
          timestamp: payload?.timestamp,
        });
      };

      source.addEventListener("status", handleStatus);
      source.addEventListener("progress", handleProgress);
      eventListenersRef.current = {
        status: handleStatus,
        progress: handleProgress,
      };
      source.onerror = () => {
        source.close();
        eventSourceRef.current = null;
        toast.error("Oops! it seems we ran into an error");
        poll(id, 0);
      };
    },
    [poll]
  );

  const submit = useCallback(
    async (body: IngestRequest) => {
      clearPolling();
      closeStream();
      setJob(null);
      setInfo(null);
      setProgress(null);
      setStatus("pending");
      setTranscript(null);
      setTranscriptStatus("idle");
      setTranscriptError(null);
      transcribeStartedForRef.current = null;
      try {
        const infoResult = await fetch(
          `/api/info?url=${encodeURIComponent(body.url)}`
        );
        const infoJson = await readJson(infoResult);
        if (!infoResult.ok) {
          throw new Error(infoJson?.error || "info_failed");
        }
        setInfo(InfoResponseSchema.parse(infoJson));

        const ingestResult = await fetch("/api/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const ingestJson = await readJson(ingestResult);
        if (!ingestResult.ok) {
          toast.error(ingestJson?.error || "ingest_failed");
        }

        const parsed = IngestResponseSchema.parse(ingestJson);
        setJobId(parsed.jobId);
        startStream(parsed.jobId);
      } catch (e) {
        toast.error((e as Error)?.message || "Submit failed");
        setStatus(null);
      }
    },
    [startStream]
  );

  const startTranscription = useCallback(
    async (opts: {
      url?: string;
      formatAs?: "transcript" | "subtitles";
      language?: string;
    }) => {
      const format = opts.formatAs ?? "transcript";

      if (format !== "transcript") {
        setTranscriptStatus("error");
        setTranscriptError("Unsupported transcription format");
        return;
      }

      if (!opts.url) {
        setTranscriptStatus("error");
        setTranscriptError("Missing audio URL for transcription");
        return;
      }

      setTranscriptStatus("pending");
      setTranscriptError(null);

      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: opts.url,
            formatAs: format,
            language: opts.language,
          }),
        });

        const json = await readJson(res);
        if (!res.ok) {
          toast.error(json?.error || "transcription_failed");
          setTranscriptStatus("error");
          setTranscriptError(json?.error || "transcription_failed");
          return;
        }

        const parsed = TranscribeTranscriptResponseSchema.safeParse(json);
        if (!parsed.success) {
          toast.error("Invalid transcription response");
          setTranscriptStatus("error");
          setTranscriptError("Invalid transcription response");
          return;
        }

        setTranscript(parsed.data);
        setTranscriptStatus("success");
      } catch (e) {
        toast.error((e as Error)?.message || "Submit failed");
        setTranscriptStatus("error");
        setTranscriptError((e as Error)?.message || "Submit failed");
      }
    },
    []
  );

  useEffect(
    () => () => {
      clearPolling();
      closeStream();
    },
    []
  );

  return {
    submit,
    jobId,
    status,
    job,
    info,
    progress,
    transcript,
    transcriptStatus,
    transcriptError,
    startTranscription,
    fetchJobStatus,
  };
}
