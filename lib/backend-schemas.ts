import { z } from "zod";

export const ALLOWED_VIDEO_DOMAINS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "music.youtube.com",
] as const;

const QUALITY_VALUES = ["2160p", "1440p", "1080p", "720p", "best"] as const;
const MEDIA_TYPES = ["video", "audio"] as const;

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

export const IngestRequestSchema = z
  .object({
    url: AllowedUrlSchema.optional(),
    videoId: z.string().optional(),
    quality: z.enum(QUALITY_VALUES).optional(),
    mediaType: z.enum(MEDIA_TYPES).optional().default("video"),
    audioOnly: z.boolean().optional().default(false),
    downloadVideo: z.boolean().optional().default(true),
    preferMp4: z.boolean().optional().default(true),
    concurrentFragments: z.number().int().positive().optional().default(8),
    gcsResumable: z.boolean().optional().default(true),
    gcsChunkSizeMb: z.number().positive().optional().default(8),
    gcsGzip: z.boolean().optional().default(false),
    gcsValidation: z.boolean().optional().default(false),
    remuxToMp4: z.boolean().optional().default(false),
  })
  .refine(
    (data) => Boolean(data.url || data.videoId),
    "url or videoId is required"
  );

export type IngestRequest = z.infer<typeof IngestRequestSchema>;

export const IngestResponseSchema = z.object({
  jobId: z.string(),
  servedQuality: z.enum(QUALITY_VALUES).optional(),
});
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

export const SegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  words: z
    .array(
      z.object({
        start: z.number(),
        end: z.number(),
        text: z.string(),
      })
    )
    .optional(),
});
export type Segment = z.infer<typeof SegmentSchema>;

export const JobOptionsSchema = z.object({
  quality: z.enum(QUALITY_VALUES).nullable().optional(),
  servedQuality: z.enum(QUALITY_VALUES).nullable().optional(),
  mediaType: z.enum(MEDIA_TYPES).nullable().optional(),
  audioOnly: z.boolean().nullable().optional(),
  downloadVideo: z.boolean().nullable().optional(),
  preferMp4: z.boolean().nullable().optional(),
  concurrentFragments: z.number().int().positive().nullable().optional(),
  gcsResumable: z.boolean().nullable().optional(),
  gcsChunkSizeMb: z.number().positive().nullable().optional(),
  gcsGzip: z.boolean().nullable().optional(),
  gcsValidation: z.boolean().nullable().optional(),
  remuxToMp4: z.boolean().nullable().optional(),
});

export const JobMediaSchema = z.object({
  gcsPath: z.string(),
  gcsUri: z.string(),
  ext: z.string(),
  signedUrl: z.string().url().optional(),
  sizeBytes: z.number().optional(),
  durationSeconds: z.number().optional(),
  audioOnly: z.boolean(),
  mediaType: z.enum(MEDIA_TYPES),
  quality: z.enum(QUALITY_VALUES).nullable(),
  servedQuality: z.enum(QUALITY_VALUES).nullable(),
});

export const JobTranscriptSchema = z.object({
  gcsPath: z.string(),
  gcsUri: z.string(),
  signedUrl: z.string().url().optional(),
  segments: z.array(SegmentSchema).optional(),
});

export const JobStatusSchema = z.object({
  id: z.string(),
  videoId: z.string(),
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
  videoId: z.string(),
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

export const TranscribeRequestSchema = z
  .object({
    url: GcsSignedUrlSchema.optional(),
    videoId: z.string().optional(),
    mediaType: z.enum(MEDIA_TYPES).optional().default("audio"),
    formatAs: z.enum(["transcript", "subtitles"]).default("transcript"),
    language: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.url || data.videoId),
    "url or videoId is required"
  );
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

export const MediaSignedUrlResponseSchema = z.object({
  signedUrl: z.string().url(),
  expiresIn: z.number(),
  gcsPath: z.string(),
  servedQuality: z.enum(QUALITY_VALUES).nullable(),
});
export type MediaSignedUrlResponse = z.infer<
  typeof MediaSignedUrlResponseSchema
>;
