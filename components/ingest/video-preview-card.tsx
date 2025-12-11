"use client";

import { useIngest } from "@/providers/IngestProvider";
import { Card, Inset, Text } from "@whop/react/components";

export function VideoPreviewCard() {
  const { info } = useIngest();

  if (!info) return null;

  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      <Card
        size="2"
        className="relative p-0 overflow-hidden shadow-sm"
      >
        <div className="flex flex-col sm:flex-row">
          {info.thumbnail && (
            <div className="w-full sm:w-1/3 aspect-video sm:aspect-auto relative">
               <img
                src={info.thumbnail}
                alt="thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 p-4 flex flex-col justify-center">
            <Text
              size="3"
              weight="bold"
              className="line-clamp-2 leading-tight mb-2"
            >
              {info.title}
            </Text>
            <div className="flex items-center gap-2">
              <Text size="1" color="gray">
                {info.uploader}
              </Text>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <Text size="1" color="gray">
                {info.durationSeconds
                  ? `${Math.floor(info.durationSeconds / 60)}:${(
                      info.durationSeconds % 60
                    )
                      .toString()
                      .padStart(2, "0")}`
                  : "N/A"}
              </Text>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}