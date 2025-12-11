"use client";

import { useIngest } from "@/providers/IngestProvider";
import { Card, Text } from "@whop/react/components";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown20, Checkmark20, Copy20, Sparkle20 } from "@frosted-ui/icons";

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
    percentage = 95; // Fake progress
  }

  return (
    <div className="w-full max-w-lg mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl" />

        <Card
          size="4"
          className="relative overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative space-y-8 p-2">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    {isComplete ? (
                      <Checkmark20 className="w-8 h-8 text-white" />
                    ) : (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkle20 className="w-8 h-8 text-white/90" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={isComplete ? "complete" : "processing"}
              >
                <Text size="4" weight="bold" className="text-white">
                  {isComplete ? "Ready for Content" : "Analyzing Video"}
                </Text>
                <Text size="2" className="text-white/60 mt-1 block">
                  {info?.title || "Preparing your workspace..."}
                </Text>
              </motion.div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium text-white/50 uppercase tracking-wider px-1">
                <span>Progress</span>
                <span>{percentage}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatusStep
                icon={ArrowDown20}
                label="Download"
                status={!!progress?.bytes ? "completed" : "active"}
              />
              <StatusStep
                icon={Copy20}
                label="Transcribe"
                status={
                  job?.transcript?.segments?.length
                    ? "completed"
                    : isProcessing
                    ? "active"
                    : "pending"
                }
              />
              <StatusStep
                icon={Sparkle20}
                label="Analyze"
                status={
                  isComplete
                    ? "completed"
                    : isProcessing
                    ? "pending"
                    : "pending"
                }
              />
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function StatusStep({
  icon: Icon,
  label,
  status,
}: Readonly<{
  icon: any;
  label: string;
  status: "pending" | "active" | "completed";
}>) {
  const isCompleted = status === "completed";
  const isActive = status === "active";

  return (
    <div
      className={`
      flex flex-col items-center gap-3 p-3 rounded-xl transition-all duration-300
      ${isActive ? "bg-white/10 ring-1 ring-white/20" : "bg-transparent"}
    `}
    >
      <div
        className={`
        p-2 rounded-full transition-colors duration-300
        ${
          isCompleted
            ? "bg-green-500/20 text-green-400"
            : isActive
            ? "bg-blue-500/20 text-blue-400"
            : "bg-white/5 text-white/20"
        }
      `}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span
        className={`text-xs font-medium transition-colors ${
          isActive || isCompleted ? "text-white/90" : "text-white/40"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
