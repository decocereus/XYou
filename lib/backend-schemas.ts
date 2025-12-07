import { z } from "zod";

export const ALLOWED_VIDEO_DOMAINS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "music.youtube.com",
] as const;

const urlAllowlistCheck = (value: string, ctx: z.RefinementCtx) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (
      !ALLOWED_VIDEO_DOMAINS.includes(
        hostname as (typeof ALLOWED_VIDEO_DOMAINS)[number]
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unsupported domain",
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "invalid url",
    });
  }
};

export const AllowedUrlSchema = z
  .string()
  .url({ message: "invalid url" })
  .superRefine(urlAllowlistCheck);

const gcsSignedUrlCheck = (value: string, ctx: z.RefinementCtx) => {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const isHttps = parsed.protocol === "https:";
    const isGcsHost =
      hostname === "storage.googleapis.com" ||
      hostname.endsWith(".storage.googleapis.com");

    if (!isHttps || !isGcsHost) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unsupported url; must be a signed GCS https url",
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "invalid url",
    });
  }
};

export const GcsSignedUrlSchema = z
  .string()
  .url({ message: "invalid url" })
  .superRefine(gcsSignedUrlCheck);

export const IngestRequestSchema = z.object({
  url: AllowedUrlSchema,
  quality: z.enum(["1080p", "720p", "best"]).optional(),
  audioOnly: z.boolean().optional().default(false),
  downloadVideo: z.boolean().optional().default(true),
  preferMp4: z.boolean().optional(),
  concurrentFragments: z.number().int().positive().optional(),
  gcsResumable: z.boolean().optional(),
  gcsChunkSizeMb: z.number().positive().optional(),
  gcsGzip: z.boolean().optional().default(true),
  gcsValidation: z.boolean().optional().default(false),
  remuxToMp4: z.boolean().optional().default(false),
});

export type IngestRequest = z.infer<typeof IngestRequestSchema>;

export const IngestResponseSchema = z.object({
  jobId: z.string(),
});
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

export const SegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
});
export type Segment = z.infer<typeof SegmentSchema>;

export const JobOptionsSchema = z.object({
  quality: z.enum(["1080p", "720p", "best"]).nullable().optional(),
  audioOnly: z.boolean().nullable().optional(),
  downloadVideo: z.boolean().nullable().optional(),
  preferMp4: z.boolean().nullable().optional(),
  concurrentFragments: z.number().int().positive().nullable().optional(),
  gcsResumable: z.boolean().nullable().optional(),
  gcsChunkSizeMb: z.number().positive().nullable().optional(),
});

export const JobMediaSchema = z.object({
  gcsPath: z.string(),
  gcsUri: z.string(),
  ext: z.string(),
  signedUrl: z.string().url().optional(),
  sizeBytes: z.number().optional(),
  durationSeconds: z.number().optional(),
  audioOnly: z.boolean(),
});

export const JobTranscriptSchema = z.object({
  gcsPath: z.string(),
  gcsUri: z.string(),
  signedUrl: z.string().url().optional(),
  segments: z.array(SegmentSchema).optional(),
});

export const JobStatusSchema = z.object({
  id: z.string(),
  url: AllowedUrlSchema,
  options: JobOptionsSchema,
  status: z.enum(["pending", "running", "success", "error"]),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  media: JobMediaSchema.optional(),
  transcript: JobTranscriptSchema.optional(),
});
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const InfoResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  durationSeconds: z.number().nullable(),
  ext: z.string().nullable(),
  thumbnail: z.string().url().nullable(),
  uploader: z.string().nullable(),
});
export type InfoResponse = z.infer<typeof InfoResponseSchema>;

export const TranscribedWordSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
});
export type TranscribedWord = z.infer<typeof TranscribedWordSchema>;

export const TranscribedSegmentSchema = z.object({
  id: z.number().optional(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  words: z.array(TranscribedWordSchema).optional(),
});
export type TranscribedSegment = z.infer<typeof TranscribedSegmentSchema>;

export const TranscribeRequestSchema = z.object({
  url: GcsSignedUrlSchema,
  formatAs: z.enum(["transcript", "subtitles"]).default("transcript"),
  language: z.string().optional(),
});
export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;

export const TranscribeTranscriptResponseSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
  segments: z.array(TranscribedSegmentSchema),
});
export type TranscribeTranscriptResponse = z.infer<
  typeof TranscribeTranscriptResponseSchema
>;

export const TranscribeSubtitlesResponseSchema = z.object({
  segments: z.array(TranscribedSegmentSchema),
});
export type TranscribeSubtitlesResponse = z.infer<
  typeof TranscribeSubtitlesResponseSchema
>;
