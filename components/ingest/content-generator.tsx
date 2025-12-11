"use client";

import { useMemo, useState } from "react";
import { Button, Card, Text } from "@whop/react/components";
import { useIngest } from "@/providers/IngestProvider";
import {
  ContentFormat,
  Tone,
  contentFormatLabels,
  defaultBatchSize,
  toneLabels,
} from "@/lib/content-types";
import { ContentCards } from "./content-cards";
import { Sparkle20, ArrowRight20, RotateRight20 } from "@frosted-ui/icons";
import { motion } from "framer-motion";

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

  const formats: ContentFormat[] = ["tweet", "thread", "linkedin", "shorts"];
  const tones: Tone[] = ["viral", "professional", "casual", "educational"];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card size="3" className="h-full bg-white/5 border-white/10 backdrop-blur-sm">
            <div className="space-y-6">
              <div>
                <Text weight="semi-bold" size="3" className="mb-1 text-white">
                  Configuration
                </Text>
                <Text size="1" className="text-white/50">
                  Customize your content output
                </Text>
              </div>

              <div className="space-y-3">
                <Text size="1" className="uppercase tracking-wider text-white/40 font-medium">Format</Text>
                <div className="grid grid-cols-2 gap-2">
                  {formats.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFormat(f);
                        setCount(defaultBatchSize[f]);
                      }}
                      disabled={genContentLoading}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                        ${format === f 
                          ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" 
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"}
                      `}
                    >
                      {contentFormatLabels[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Text size="1" className="uppercase tracking-wider text-white/40 font-medium">Tone</Text>
                <div className="flex flex-wrap gap-2">
                  {tones.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      disabled={genContentLoading}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                        ${tone === t 
                          ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50" 
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"}
                      `}
                    >
                      {toneLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <Button
                  size="3"
                  variant="solid"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  loading={genContentLoading}
                >
                  <div className="flex items-center gap-2">
                    <Sparkle20 />
                    Generate Content
                  </div>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {generatedContent.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text weight="semi-bold" size="3" className="text-white">Generated Results</Text>
                <Button 
                  size="2" 
                  variant="ghost" 
                  className="text-white/50 hover:text-white"
                  onClick={resetGeneratedContent}
                >
                  <RotateRight20 className="mr-2" /> Clear Results
                </Button>
              </div>
              <ContentCards
                items={generatedContent}
                onRegenerate={regenerateContent}
                onRefine={onRefine}
                disabled={genContentLoading}
              />
            </div>
          ) : (
            <div className="h-full min-h-[400px] rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Sparkle20 className="w-8 h-8 text-white/20" />
              </div>
              <Text size="3" weight="medium" className="text-white mb-2">
                Ready to Generate
              </Text>
              <Text className="text-white/40 max-w-sm">
                Select your preferences on the left and click Generate to create AI-powered content from your video.
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}