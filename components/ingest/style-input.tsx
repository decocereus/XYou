"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Text,
  TextArea,
  TextField,
  Card,
} from "@whop/react/components";
import { Sparkle20, Plus20 } from "@frosted-ui/icons";
import { motion, AnimatePresence } from "framer-motion";

type StyleInputProps = {
  onAnalyze: (tweets: string[]) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
};

export function StyleInput({
  onAnalyze,
  isLoading,
  disabled,
}: Readonly<StyleInputProps>) {
  const [tweets, setTweets] = useState<string[]>([""]);
  const [bulkInput, setBulkInput] = useState("");
  const [mode, setMode] = useState<"individual" | "bulk">("bulk");

  const addTweet = useCallback(() => {
    if (tweets.length < 15) {
      setTweets((prev) => [...prev, ""]);
    }
  }, [tweets.length]);

  const removeTweet = useCallback((index: number) => {
    setTweets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTweet = useCallback((index: number, value: string) => {
    setTweets((prev) => prev.map((t, i) => (i === index ? value : t)));
  }, []);

  const handleBulkParse = useCallback(() => {
    // Parse bulk input - split by double newlines or numbered lines
    const lines = bulkInput
      .split(/\n{2,}|\n(?=\d+\.\s)/)
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line) => line.length > 0 && line.length <= 500);

    if (lines.length > 0) {
      setTweets(lines.slice(0, 15));
      setMode("individual");
    }
  }, [bulkInput]);

  const handleAnalyze = useCallback(async () => {
    const validTweets = tweets.filter((t) => t.trim().length > 10);
    if (validTweets.length >= 3) {
      await onAnalyze(validTweets);
    }
  }, [tweets, onAnalyze]);

  const validCount = tweets.filter((t) => t.trim().length > 10).length;
  const canAnalyze = validCount >= 3 && !isLoading && !disabled;

  return (
    <Card size="3" className="bg-white/5 border-white/10 backdrop-blur-sm">
      <div className="space-y-4">
        <div>
          <Text weight="semi-bold" size="3" className="text-white mb-1">
            Writing Style Analysis
          </Text>
          <Text size="1" className="text-white/50">
            Paste 5-10 example tweets you like. We'll analyze the style and
            match it.
          </Text>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "bulk"
                ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Paste All
          </button>
          <button
            type="button"
            onClick={() => setMode("individual")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "individual"
                ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Add One by One
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "bulk" ? (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <TextArea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Paste multiple tweets here, separated by blank lines or numbered (1. 2. 3.)...

Example:
1. First tweet goes here with some engaging content

2. Second tweet with a different insight or hook

3. Third example tweet..."
                className="min-h-[200px] bg-black/20 border-white/10 text-white placeholder:text-white/30"
                disabled={disabled}
              />
              <Button
                size="2"
                variant="soft"
                className="w-full"
                onClick={handleBulkParse}
                disabled={bulkInput.trim().length < 30 || disabled}
              >
                Parse Tweets (
                {bulkInput.split(/\n{2,}/).filter((l) => l.trim()).length}{" "}
                detected)
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="individual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {tweets.map((tweet, index) => (
                  <motion.div
                    key={tweet}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 items-start"
                  >
                    <span className="text-xs text-white/40 font-mono mt-2.5 w-6">
                      {index + 1}.
                    </span>
                    <TextField.Root size="2" className="flex-1">
                      <TextField.Input
                        value={tweet}
                        onChange={(e) => updateTweet(index, e.target.value)}
                        placeholder="Paste a tweet example..."
                        className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                        disabled={disabled}
                      />
                    </TextField.Root>
                    {tweets.length > 1 && (
                      <Button
                        size="1"
                        variant="ghost"
                        className="text-white/40 hover:text-red-400 mt-1"
                        onClick={() => removeTweet(index)}
                        disabled={disabled}
                      >
                        ✕
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>

              {tweets.length < 15 && (
                <Button
                  size="2"
                  variant="ghost"
                  className="w-full text-white/50 hover:text-white border border-dashed border-white/20"
                  onClick={addTweet}
                  disabled={disabled}
                >
                  <Plus20 className="mr-2" /> Add Another Tweet
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status and Analyze Button */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <Text
            size="1"
            className={validCount >= 3 ? "text-green-400" : "text-white/40"}
          >
            {validCount}/15 valid tweets {validCount < 3 && "(need at least 3)"}
          </Text>
          <Button
            size="2"
            variant="solid"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            loading={isLoading}
          >
            <Sparkle20 className="mr-2" />
            Analyze Style
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Display component for analyzed style
type StyleProfileDisplayProps = {
  style: {
    tone: string;
    vocabulary: string;
    sentenceStructure: string;
    hooks: string;
    patterns: string[];
    summary: string;
  };
  name?: string;
  onClear?: () => void;
};

export function StyleProfileDisplay({
  style,
  name,
  onClear,
}: Readonly<StyleProfileDisplayProps>) {
  return (
    <Card size="2" className="bg-green-500/10 border-green-500/20">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <Text weight="semi-bold" size="2" className="text-green-400">
              {name || "Style Profile Active"}
            </Text>
          </div>
          {onClear && (
            <Button
              size="1"
              variant="ghost"
              className="text-white/40 hover:text-white"
              onClick={onClear}
            >
              ✕
            </Button>
          )}
        </div>

        <Text size="1" className="text-white/70 leading-relaxed">
          {style.summary}
        </Text>

        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded-full text-xs bg-white/10 text-white/70">
            {style.tone}
          </span>
          {style.patterns.slice(0, 3).map((pattern) => (
            <span
              key={pattern}
              className="px-2 py-1 rounded-full text-xs bg-white/5 text-white/50"
            >
              {pattern}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
