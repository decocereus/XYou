"use client";

import { useIngest } from "@/providers/IngestProvider";
import { Card, Inset, Text, Theme } from "@whop/react/components";

export function VideoPreviewCard() {
  const { info } = useIngest();

  if (!info) return null;

  return (
    <Card variant="surface" className="relative p-0!">
      {info.thumbnail && (
        <Inset clip="border-box" side="all">
          <img
            src={info.thumbnail}
            alt="thumbnail"
            className="h-full w-full object-cover"
          />
        </Inset>
      )}
      <Theme accentColor="crimson" appearance="dark">
        <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
          <Text size="5" weight="semi-bold">
            {info.title}
          </Text>
          <Text color="gray" size="3">
            {info.durationSeconds
              ? `${Math.round(info.durationSeconds / 60)} min`
              : "Duration n/a"}
            {info.ext ? ` • ${info.ext}` : ""}
            {info.uploader ? ` • ${info.uploader}` : ""}
          </Text>
        </div>
      </Theme>
    </Card>
  );
}
