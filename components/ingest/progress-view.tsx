"use client";

import { motion } from "framer-motion";
import { useIngest } from "@/providers/IngestProvider";
import { Card, Text, Progress } from "@whop/react/components";
import { useEffect, useState } from "react";

export function ProgressView() {
  const { status, progress, info, job } = useIngest();
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const isProcessing = status === "running";
  const isComplete = status === "success";

  // Calculate percentage
  let percentage = 0;
  if (isComplete) percentage = 100;
  else if (progress?.totalBytes && progress?.bytes) {
    percentage = Math.round((progress.bytes / progress.totalBytes) * 100);
  } else if (isProcessing) {
    // Fake progress for processing phase if no bytes
    percentage = 95;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card
        variant="classic"
        size="4"
        className="backdrop-blur-md bg-white/5 border border-white/10 shadow-xl overflow-hidden relative"
      >
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x" />

        <div className="space-y-6 p-2">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-y-2">
              <Text size="4" weight="semi-bold" className="text-white">
                {isComplete ? "Analysis Complete" : `Processing Video${dots}`}
              </Text>
              <Text size="2" color="gray">
                {info?.title || "Fetching video details..."}
              </Text>
            </div>
            {isComplete && (
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                ✓
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-y-2">
            <div className="flex  items-center gap-x-3 text-xs text-gray-400 uppercase tracking-wider">
              <span>Progress</span>
              <span>{percentage}%</span>
            </div>
            {/* Custom Progress Bar for more control if needed, but Whop's is fine */}
            <Progress
              value={percentage}
              max={100}
              size="2"
              color={isComplete ? "green" : "blue"}
              className="h-2 rounded-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <StatusItem
              label="Download"
              active={!!progress?.bytes}
              completed={!isProcessing && !!job}
            />
            <StatusItem
              label="Transcribe"
              active={isProcessing}
              completed={!!job?.transcript?.segments?.length}
            />
            <StatusItem
              label="Analyze"
              active={isProcessing}
              completed={isComplete}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function StatusItem({
  label,
  active,
  completed,
}: Readonly<{
  label: string;
  active: boolean;
  completed: boolean;
}>) {
  const completedText = completed ? "text-green-400" : "text-gray-600";
  const completedBg = completed ? "bg-green-400" : "bg-gray-700";
  return (
    <div
      className={`flex flex-col items-center gap-2 transition-colors ${
        active ? "text-blue-400" : completedText
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          active ? "bg-blue-400 animate-pulse" : completedBg
        }`}
      />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
