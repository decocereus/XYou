"use client";

import { useIngest } from "@/providers/IngestProvider";
import { Button, Card, Separator, Text } from "@whop/react/components";

export function TweetGenerator() {
  const { status, transcriptStatus, genLoading, genError, generateThreads } =
    useIngest();

  const transcriptReady =
    status === "success" && transcriptStatus !== "pending";

  if (!status && transcriptStatus === "idle") return null;

  return (
    <Card variant="classic" size="4" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Text size="4" weight="semi-bold">
            Generate social threads
          </Text>
          <Text color="gray" size="2">
            We will use the transcript segments to draft threads in different
            styles.
          </Text>
        </div>
        <Button
          size="3"
          variant="solid"
          color="blue"
          onClick={generateThreads}
          disabled={!transcriptReady || genLoading}
          loading={genLoading}
        >
          {genLoading ? "Generating" : "Generate threads"}
        </Button>
      </div>

      <Separator />

      <Text size="2" color="gray">
        {transcriptReady
          ? "Ready to generate — you can run multiple passes."
          : "Waiting for transcription to finish."}
      </Text>

      {genError && (
        <Card
          variant="surface"
          size="2"
          className="border border-danger-6 bg-danger-2 text-danger-11"
        >
          <Text weight="semi-bold" size="2">
            {genError}
          </Text>
        </Card>
      )}
    </Card>
  );
}
