"use client";

import { useMemo, useState } from "react";
import { Button, Card, Text } from "@whop/react/components";
import { useIngest } from "@/providers/IngestProvider";
import { ContentFormat, Tone, defaultBatchSize } from "@/lib/content-types";
import { FormatSelector } from "./format-selector";
import { ContentCards } from "./content-cards";
import { Sparkle20 } from "@frosted-ui/icons";

type ContentGeneratorProps = {
  onRefine?: (text: string) => void;
};

export function ContentGenerator({
  onRefine,
}: Readonly<ContentGeneratorProps>) {
  const {
    generateContent,
    regenerateContent,
    generatedContent,
    genContentLoading,
    genContentError,
    resetGeneratedContent,
    transcriptStatus,
  } = useIngest();

  const [format, setFormat] = useState<ContentFormat>("tweet");
  const [tone, setTone] = useState<Tone>("viral");
  const [count, setCount] = useState<number>(defaultBatchSize["tweet"]);

  const canGenerate = useMemo(
    () => transcriptStatus === "success" && !genContentLoading,
    [genContentLoading, transcriptStatus]
  );

  const handleGenerate = async () => {
    await generateContent({ format, tone, count });
  };

  return (
    <div className="space-y-4">
      <FormatSelector
        format={format}
        tone={tone}
        count={count}
        disabled={genContentLoading}
        onChange={(next) => {
          if (next.format) {
            setFormat(next.format);
            setCount(defaultBatchSize[next.format]);
          }
          if (next.tone) setTone(next.tone);
          if (typeof next.count === "number") setCount(next.count);
        }}
      />

      <Card variant="classic" size="3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-y-1 items-start">
            <Text weight="semi-bold" className="text-white">
              Generate content
            </Text>
            <Text size="2" color="gray">
              We'll create {count} {format} item
              {count > 1 ? "s" : ""} with a {tone} tone.
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="3"
              color="gray"
              disabled={!generatedContent.length || genContentLoading}
              onClick={resetGeneratedContent}
            >
              Clear
            </Button>
            <Button
              size="3"
              variant="solid"
              color="blue"
              onClick={handleGenerate}
              disabled={!canGenerate}
              loading={genContentLoading}
              className="gap-2"
            >
              <Sparkle20 /> Generate
            </Button>
          </div>
        </div>
        {genContentError && (
          <Text size="2" color="red" className="mt-2">
            {genContentError}
          </Text>
        )}
        {transcriptStatus !== "success" && (
          <Text size="2" color="gray" className="mt-2">
            Waiting for transcript…
          </Text>
        )}
        <ContentCards
          items={generatedContent}
          onRegenerate={regenerateContent}
          onRefine={onRefine}
          disabled={genContentLoading}
        />
      </Card>
    </div>
  );
}
