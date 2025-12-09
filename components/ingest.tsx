"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IngestFormCard } from "./ingest/ingest-form";
import { ProgressView } from "./ingest/progress-view";
import { ChatInterface } from "./ingest/chat-interface";
import { VideoPreviewCard } from "./ingest/video-preview-card";
import { IngestProvider, useIngest } from "@/providers/IngestProvider";
import { ContentGenerator } from "./ingest/content-generator";

function IngestFlow() {
  const { status, transcriptStatus, info } = useIngest();
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  // Step 2: Processing (status is running/processing OR transcript is pending)
  const isProcessing = status === "running" || transcriptStatus === "pending";

  // Step 3: Chat (Job success AND Transcript success)
  const isChatStep = status === "success" && transcriptStatus === "success";

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 relative h-full">
      <AnimatePresence mode="wait">
        {!status && (
          <motion.div
            key="form"
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
          >
            <IngestFormCard />
          </motion.div>
        )}
        <div className="">{info && <VideoPreviewCard />}</div>

        {isProcessing && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <ProgressView />
          </motion.div>
        )}

        {isChatStep && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, type: "spring" }}
            className="w-full h-full flex flex-col gap-y-5 py-6"
          >
            <ContentGenerator onRefine={(text) => setChatPrefill(text)} />
            <ChatInterface
              prefillInput={chatPrefill}
              onConsumePrefill={() => setChatPrefill(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Ingest() {
  return (
    <IngestProvider>
      <IngestFlow />
    </IngestProvider>
  );
}
