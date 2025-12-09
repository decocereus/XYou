"use client";

import { useIngest } from "@/providers/IngestProvider";
import { Card, Inset, Text } from "@whop/react/components";
import { motion } from "framer-motion";

export function VideoPreviewCard() {
  const { info } = useIngest();

  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card
        variant="classic"
        size="2"
        className="relative p-0  border-0 shadow-xl group"
      >
        {info.thumbnail && (
          <Inset
            clip="border-box"
            side="all"
            className="aspect-video bg-black/50"
          >
            <img
              src={info.thumbnail}
              alt="thumbnail"
              className="h-full w-full  object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
            />
          </Inset>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20">
          <Text
            size="3"
            weight="bold"
            className="text-white line-clamp-2 leading-tight"
          >
            {info.title}
          </Text>
          <div className="flex items-center gap-2 mt-1">
            <Text size="1" className="text-gray-300">
              {info.uploader}
            </Text>
            <span className="w-1 h-1 rounded-full bg-gray-400" />
            <Text size="1" className="text-gray-300">
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
      </Card>
    </motion.div>
  );
}
