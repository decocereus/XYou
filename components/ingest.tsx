"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IngestFormCard } from "./ingest/ingest-form";
import { ProgressView } from "./ingest/progress-view";
import { ChatInterface } from "./ingest/chat-interface";
import { VideoPreviewCard } from "./ingest/video-preview-card";
import { IngestProvider, useIngest } from "@/providers/IngestProvider";

function IngestFlow() {
  const { status, transcriptStatus, info } = useIngest();
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  console.log("STATUS", status);

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <IngestFormCard />
          </motion.div>
        )}
        <div className="">{info && <VideoPreviewCard />}</div>

        {isProcessing && (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <ProgressView />
          </motion.div>
        )}

        {isChatStep && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col gap-y-5 py-6"
          >
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
