"use client";

import { useIngest } from "@/providers/IngestProvider";
import { ArrowRight20, Link20 } from "@frosted-ui/icons";
import { Button, Card, Text, TextField } from "@whop/react/components";
import { motion } from "framer-motion";

export function IngestFormCard() {
  const { url, setUrl, canSubmit, submitIngest, status } = useIngest();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto"
    >
      <Card
        variant="classic"
        size="4"
        className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="space-y-6 p-2 relative z-10">
          <div className="space-y-2 text-center">
            <div className="flex gap-x-2 items-center justify-center">
              <Link20 />
              <Text
                size="4"
                weight="bold"
                className="text-white tracking-tight"
              >
                yt2x
              </Text>
            </div>

            <Text size="2" color="gray" className="max-w-xs mx-auto">
              Paste a YouTube URL to begin the AI analysis and content
              generation process.
            </Text>
          </div>

          <div className="space-y-4">
            <div className="relative group/input">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg opacity-20 group-focus-within/input:opacity-100 transition duration-500 blur-sm" />
              <TextField.Root
                size="3"
                variant="surface"
                className="w-full bg-black/40 border-white/10 relative"
              >
                <TextField.Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full text-white placeholder:text-gray-600"
                />
              </TextField.Root>
            </div>

            <Button
              size="3"
              variant="solid"
              color="blue"
              onClick={submitIngest}
              disabled={!canSubmit}
              className="w-full relative overflow-hidden group/btn"
              loading={status === "running" || status === "pending"}
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Analysis{" "}
                <ArrowRight20 className="group-hover/btn:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
