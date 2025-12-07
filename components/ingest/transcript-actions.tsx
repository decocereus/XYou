"use client";

import { useIngest } from "@/providers/IngestProvider";
import { Button, Card, Separator, Text } from "@whop/react/components";

export function TranscriptActions() {
  const {
    status,
    transcriptStatus,
    transcriptError,
    job,
    downloadTranscript,
    transcript,
  } = useIngest();
  console.log("JOB", job);

  const transcriptReady =
    status === "success" && !!job?.transcript?.signedUrl && !transcriptError;

  if (!status && transcriptStatus === "idle") return null;

  return (
    <Card variant="surface" size="4" className="space-y-3">
      <div className="flex flex-col items-start gap-y-1 w-full">
        <Text size="4" weight="semi-bold">
          Transcript
        </Text>
        <Text color="gray" size="2">
          Whisper transcription kicks off after ingest completes. Download the
          text once ready.
        </Text>
      </div>

      <Separator className="my-5 w-full" />

      <div className="flex flex-col items-start gap-y-3">
        <Button
          size="3"
          variant="surface"
          color="blue"
          disabled={!transcriptReady}
          onClick={downloadTranscript}
        >
          Download transcript
        </Button>
      </div>

      {transcript?.segments && transcript?.segments.length > 0 && (
        <div className="space-y-1 rounded-lg border border-gray-a5 bg-gray-a2 p-3">
          <Text size="2" weight="semi-bold">
            TL;DR
          </Text>
          <ul className="list-disc space-y-1 pl-4 text-2 text-gray-12">
            {transcript.segments.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
      )}

      {transcriptError && (
        <Card
          variant="surface"
          size="2"
          className="border border-danger-6 bg-danger-2 text-danger-11"
        >
          <Text weight="semi-bold" size="2">
            {transcriptError}
          </Text>
        </Card>
      )}
    </Card>
  );
}
