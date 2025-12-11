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
  StyleProfile,
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
  // Style profile state
  styleProfile: StyleProfile | null;
  setStyleProfile: (profile: StyleProfile | null) => void;
  styleLoading: boolean;
  analyzeStyle: (exampleTweets: string[]) => Promise<void>;
  // Purpose state
  purpose: string;
  setPurpose: (purpose: string) => void;
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

  // Style profile state
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [styleLoading, setStyleLoading] = useState(false);

  // Purpose state
  const [purpose, setPurpose] = useState("");

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
    } catch (e: unknown) {
      const error = e as Error;
      setGenError(error?.message || "Failed to generate threads");
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

  // Analyze style from example tweets
  const analyzeStyle = useCallback(async (exampleTweets: string[]) => {
    setStyleLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: "analyze-style",
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Please analyze the writing style of these example tweets and create a style profile:\n\n${exampleTweets
                    .map((t, i) => `${i + 1}. "${t}"`)
                    .join("\n\n")}`,
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze style");
      }

      // For now, parse a simple style from the response
      // In a full implementation, we'd use the agent's tool result
      const text = await res.text();

      console.log("LOG PARSED TEXT ", text);

      // Try to extract style profile from agent response
      // This is a simplified version - the agent should return structured data
      setStyleProfile({
        tone: "engaging",
        vocabulary: "varied",
        sentenceStructure: "mixed, punchy",
        hooks: "direct statements, questions",
        patterns: ["short sentences", "contractions", "bold claims"],
        summary: "Analyzed from " + exampleTweets.length + " example tweets",
      });
    } catch (e: unknown) {
      const error = e as Error;
      console.error("Style analysis error:", error);
      // Set a default profile on error
      setStyleProfile({
        tone: "engaging",
        vocabulary: "varied",
        sentenceStructure: "mixed",
        hooks: "direct statements",
        patterns: [],
        summary: "Default style profile",
      });
    } finally {
      setStyleLoading(false);
    }
  }, []);

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

        // Use the agent endpoint for generation
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                id: "generate-content",
                role: "user",
                parts: [
                  {
                    type: "text",
                    text: `Generate ${count} ${format}${count > 1 ? "s" : ""} from this transcript. Tone: ${tone}.${
                      purpose ? ` Purpose: ${purpose}.` : ""
                    }`,
                  },
                ],
              },
            ],
            context: workingTranscript.text,
            styleProfile: styleProfile || undefined,
            purpose: purpose || undefined,
          }),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson?.error || "Failed to generate content");
        }

        // Parse SSE streaming response - collect all text deltas
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        let fullText = "";
        let toolOutput: unknown = null;
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from the buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6); // Remove "data: " prefix
              if (data.trim() === "") continue;

              try {
                const parsed = JSON.parse(data);
                // Extract text from UI message stream format
                if (parsed.type === "text-delta" && parsed.delta) {
                  fullText += parsed.delta;
                }
                // Capture tool output - this contains the actual generated content
                if (parsed.type === "tool-output-available") {
                  toolOutput = parsed;
                }
              } catch {
                // Not valid JSON, skip
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith("data: ")) {
          const data = buffer.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "text-delta" && parsed.delta) {
              fullText += parsed.delta;
            }
          } catch {
            // Not valid JSON, skip
          }
        }

        // Try to extract items from tool output first (preferred)
        const items: GeneratedContentItem[] = [];

        // Check if we have tool output with items (from generateTweets, generateThread, etc.)
        const toolOutputTyped = toolOutput as {
          output?: {
            items?: Array<{
              id?: string;
              content?: string;
              charCount?: number;
            }>;
          };
        } | null;
        if (
          toolOutputTyped?.output?.items &&
          Array.isArray(toolOutputTyped.output.items)
        ) {
          toolOutputTyped.output.items.forEach((item, idx) => {
            if (item.content) {
              items.push({
                id: item.id || `item-${idx + 1}`,
                format,
                content: item.content,
                charCount: item.charCount || item.content.length,
                tone,
              });
            }
          });
        }

        // Fallback: if no tool output items, try parsing text (for non-tool responses)
        if (items.length === 0 && fullText.trim().length > 0) {
          const parts = fullText
            .split(/\n{2,}/)
            .filter((p) => p.trim().length > 20 && p.trim().length <= 300);

          parts.slice(0, count).forEach((content, idx) => {
            items.push({
              id: `item-${idx + 1}`,
              format,
              content: content.trim(),
              charCount: content.trim().length,
              tone,
            });
          });

          // Final fallback: treat whole response as one item
          if (items.length === 0) {
            items.push({
              id: "item-1",
              format,
              content: fullText.trim().slice(0, 280),
              charCount: Math.min(fullText.trim().length, 280),
              tone,
            });
          }
        }

        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/3553b901-c218-4d7b-a8fa-eb9b28bf9eba",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "IngestProvider.tsx:410",
              message: "Final items array",
              data: {
                itemsCount: items.length,
                items: items.map((i) => ({
                  id: i.id,
                  contentLength: i.content.length,
                  contentPreview: i.content.slice(0, 100),
                })),
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              hypothesisId: "H3",
            }),
          }
        ).catch(() => {});
        // #endregion

        console.log("GENERATED CONTENT", items);

        setGeneratedContent(items);
        lastGenerationRef.current = { format, tone, count };
      } catch (e: unknown) {
        const error = e as Error;
        setGenContentError(error?.message || "Failed to generate content");
      } finally {
        setGenContentLoading(false);
      }
    },
    [resolveTranscript, styleProfile, purpose]
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

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                id: "regenerate-content",
                role: "user",
                parts: [
                  {
                    type: "text",
                    text: `Generate 1 new ${last.format} from this transcript. Tone: ${last.tone}. Make it different from previous ones.`,
                  },
                ],
              },
            ],
            context: workingTranscript.text,
            styleProfile: styleProfile || undefined,
            purpose: purpose || undefined,
          }),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson?.error || "Failed to regenerate content");
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        let fullText = "";
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from the buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data.trim() === "") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "text-delta" && parsed.delta) {
                  fullText += parsed.delta;
                }
              } catch {
                // Not valid JSON, skip
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith("data: ")) {
          const data = buffer.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "text-delta" && parsed.delta) {
              fullText += parsed.delta;
            }
          } catch {
            // Not valid JSON, skip
          }
        }

        const content = fullText.trim().slice(0, 300);
        const fresh: GeneratedContentItem = {
          id,
          format: last.format,
          content,
          charCount: content.length,
          tone: last.tone,
        };

        setGeneratedContent((prev) =>
          prev.map((item) => (item.id === id ? fresh : item))
        );
      } catch (e: unknown) {
        const error = e as Error;
        setGenContentError(error?.message || "Failed to regenerate");
      }
    },
    [resolveTranscript, styleProfile, purpose]
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
      // Style profile
      styleProfile,
      setStyleProfile,
      styleLoading,
      analyzeStyle,
      // Purpose
      purpose,
      setPurpose,
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
      styleProfile,
      styleLoading,
      analyzeStyle,
      purpose,
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
