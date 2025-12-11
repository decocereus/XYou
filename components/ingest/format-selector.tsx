"use client";

import { Button, Card, Text, TextField } from "@whop/react/components";
import {
  ContentFormat,
  Tone,
  contentFormatLabels,
  defaultBatchSize,
  toneLabels,
} from "@/lib/content-types";
import { Sparkle20 } from "@frosted-ui/icons";

type FormatSelectorProps = {
  format: ContentFormat;
  tone: Tone;
  count: number;
  onChange: (next: {
    format?: ContentFormat;
    tone?: Tone;
    count?: number;
  }) => void;
  disabled?: boolean;
};

const formatOrder: ContentFormat[] = ["tweet", "thread", "linkedin", "shorts"];

const toneOrder: Tone[] = [
  "viral",
  "professional",
  "casual",
  "educational",
  "provocative",
];

export function FormatSelector({
  format,
  tone,
  count,
  onChange,
  disabled,
}: Readonly<FormatSelectorProps>) {
  return (
    <Card
      size="3"
    >
      <div className="flex flex-col gap-y-3">
        <div className="flex items-center gap-x-2">
          <div className="w-8 h-8 rounded-lg bg-whop-primary/10 flex items-center justify-center text-whop-primary">
            <Sparkle20 />
          </div>
          <div className="flex flex-col items-start gap-y-1">
            <Text weight="semi-bold">
              Content Settings
            </Text>
            <Text size="1" color="gray">
              Choose format, tone, and batch size
            </Text>
          </div>
        </div>

        <div className="space-y-2">
          <Text size="1" color="gray" className="uppercase tracking-wide">
            Format
          </Text>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {formatOrder.map((value) => {
              const isActive = value === format;
              return (
                <Button
                  key={value}
                  size="2"
                  variant={isActive ? "solid" : "outline"}
                  color={isActive ? "blue" : "gray"}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      format: value,
                      count:
                        format === value ? undefined : defaultBatchSize[value],
                    })
                  }
                  className="w-full justify-center"
                >
                  {contentFormatLabels[value]}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Text size="1" color="gray" className="uppercase tracking-wide">
            Tone
          </Text>
          <div className="flex flex-wrap gap-2">
            {toneOrder.map((value) => {
              const isActive = value === tone;
              return (
                <Button
                  key={value}
                  size="2"
                  variant={isActive ? "solid" : "outline"}
                  color={isActive ? "purple" : "gray"}
                  disabled={disabled}
                  onClick={() => onChange({ tone: value })}
                >
                  {toneLabels[value]}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Text size="1" color="gray" className="uppercase tracking-wide">
            Batch Size
          </Text>
          <TextField.Root
            size="3"
          >
            <TextField.Input
              type="number"
              max={20}
              value={count}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  count: Math.min(
                    20,
                    Math.max(1, Number.parseInt(e.target.value) || 1)
                  ),
                })
              }
            />
          </TextField.Root>
          <Text size="1" color="gray">
            We'll generate {count} items for the selected format.
          </Text>
        </div>
      </div>
    </Card>
  );
}