"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Button,
  Text,
  TextArea,
  IconButton,
  Select,
  TextField,
  Separator,
} from "@whop/react/components";
import { useIngest } from "@/providers/IngestProvider";
import { LinkSlash20, Sparkle20, ArrowUp20 } from "@frosted-ui/icons";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  ContentFormat,
  Tone,
  contentFormatLabels,
  toneLabels,
  defaultBatchSize,
} from "@/lib/content-types";
import { ContentCards } from "./content-cards";
import { StyleInput, StyleProfileDisplay } from "./style-input";

type ChatInterfaceProps = {
  prefillInput?: string | null;
  onConsumePrefill?: () => void;
};

function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("");
}

export function ChatInterface({
  prefillInput,
  onConsumePrefill,
}: Readonly<ChatInterfaceProps>) {
  const {
    transcript,
    generateContent,
    generatedContent,
    genContentLoading,
    regenerateContent,
    resetGeneratedContent,
    transcriptStatus,
    styleProfile,
    setStyleProfile,
    styleLoading,
    analyzeStyle,
    purpose,
    setPurpose,
  } = useIngest();

  console.log("GENERATED CONTENT", generatedContent);
  console.log("GENERATED CONTENT LOADING", genContentLoading);
  console.log("GENERATED CONTENT TRANSCRIPT STATUS", transcriptStatus);
  console.log("GENERATED CONTENT STYLE PROFILE", styleProfile);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showStyleInput, setShowStyleInput] = useState(false);

  // Content Gen State
  const [format, setFormat] = useState<ContentFormat>("tweet");
  const [tone, setTone] = useState<Tone>("viral");
  const [count, setCount] = useState<number>(defaultBatchSize["tweet"]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        body: () => ({
          context: transcript?.text || "",
          styleProfile: styleProfile || undefined,
          purpose: purpose || undefined,
        }),
      }),
    [transcript?.text, styleProfile, purpose]
  );

  const { messages, sendMessage, regenerate, status } = useChat({
    transport,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "I've analyzed the video! I can help you generate tweets, threads, or scripts. You can also add a writing style by clicking 'Add Style' above.",
          },
        ],
      },
    ],
  });

  const isBusy: boolean = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generatedContent]);

  useEffect(() => {
    if (prefillInput) {
      setInput(prefillInput);
      onConsumePrefill?.();
    }
  }, [prefillInput, onConsumePrefill]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  };

  const handleRefine = (text: string) => {
    setInput(`Improve this: "${text}"`);
  };

  const handleGenerate = async () => {
    await generateContent({ format, tone, count });
  };

  const handleStyleAnalysis = async (tweets: string[]) => {
    await analyzeStyle(tweets);
    setShowStyleInput(false);
  };

  return (
    <div className="relative w-full flex flex-col h-[700px] bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkle20 />
          </div>
          <div>
            <Text weight="semi-bold" className="text-white">
              Content Assistant
            </Text>
            <Text size="1" className="text-white/50">
              AI-Powered Generation
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="1"
            variant={showStyleInput ? "soft" : "ghost"}
            className={
              showStyleInput
                ? "bg-purple-500/20 text-purple-400"
                : "text-white/50 hover:text-white"
            }
            onClick={() => setShowStyleInput(!showStyleInput)}
          >
            {styleProfile ? "Edit Style" : "Add Style"}
          </Button>
          <IconButton
            variant="ghost"
            className="text-white/40 hover:text-white"
            onClick={() => regenerate()}
          >
            <LinkSlash20 />
          </IconButton>
        </div>
      </div>

      {/* Style Profile Section */}
      <AnimatePresence>
        {(showStyleInput || styleProfile) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 overflow-hidden"
          >
            <div className="p-4">
              {showStyleInput && !styleProfile ? (
                <StyleInput
                  onAnalyze={handleStyleAnalysis}
                  isLoading={styleLoading}
                  disabled={genContentLoading}
                />
              ) : styleProfile ? (
                <StyleProfileDisplay
                  style={styleProfile}
                  name="Active Style"
                  onClear={() => {
                    setStyleProfile(null);
                    setShowStyleInput(false);
                  }}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purpose Input */}
      <div className="px-4 py-2 border-b border-white/10 bg-white/5">
        <TextField.Root size="2" className="w-full">
          <TextField.Input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Content purpose (e.g., affiliate marketing, personal brand, thought leadership)"
            className="bg-transparent border-0 text-white/80 placeholder:text-white/30 text-sm"
          />
        </TextField.Root>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          aria-label="Chat transcript"
        >
          <AnimatePresence initial={false}>
            {messages.map((message: UIMessage) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex flex-col gap-1 max-w-[85%] ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-none"
                        : "bg-white/10 text-white/90 border border-white/10 rounded-bl-none"
                    }`}
                  >
                    {getMessageContent(message)}
                  </div>
                </div>
              </motion.div>
            ))}
            {isBusy && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none border border-white/10 flex gap-1.5 items-center h-12">
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Generated Content */}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-white/5 space-y-3">
        {/* Settings Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Select.Root
            value={format}
            onValueChange={(value) => {
              const f = value as ContentFormat;
              setFormat(f);
              setCount(defaultBatchSize[f]);
            }}
          >
            <Select.Trigger className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80" />
            <Select.Content>
              <Select.Group>
                {Object.entries(contentFormatLabels).map(([k, v]) => (
                  <Select.Item
                    key={k}
                    value={k}
                    className="bg-gray-900 text-white"
                  >
                    {v}
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>

          <Select.Root
            value={tone}
            onValueChange={(value) => setTone(value as Tone)}
          >
            <Select.Trigger className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80" />
            <Select.Content>
              <Select.Group>
                {Object.entries(toneLabels).map(([k, v]) => (
                  <Select.Item
                    key={k}
                    value={k}
                    className="bg-gray-900 text-white"
                  >
                    {v}
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>

          <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
            Count
          </span>
          <TextField.Root size="2" className="w-14">
            <TextField.Input
              type="number"
              value={count}
              onChange={(e) =>
                setCount(Math.min(20, Math.max(0, Number(e.target.value))))
              }
              className="w-14 bg-transparent text-xs font-medium text-white/80 text-center"
              max={20}
            />
          </TextField.Root>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            size="2"
            className="h-8 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
            onClick={handleGenerate}
            disabled={genContentLoading || transcriptStatus !== "success"}
            loading={genContentLoading}
          >
            <Sparkle20 className="mr-1.5 w-3.5 h-3.5" />
            Generate
          </Button>
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="relative">
          <TextArea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask to generate content, refine results, or get suggestions..."
            className="w-full pr-14 min-h-[60px] resize-none bg-black/20 border-white/10 text-white placeholder:text-white/30 rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute bottom-3 right-3">
            <IconButton
              type="submit"
              disabled={isBusy || !input.trim()}
              variant="solid"
              className={`rounded-lg transition-all duration-300 ${
                input.trim()
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "bg-white/10 text-white/20"
              }`}
            >
              <ArrowUp20 />
            </IconButton>
          </div>
        </form>
      </div>
      <AnimatePresence>
        {generatedContent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10 max-h-[300px] overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-purple-500 rounded-full" />
                  <Text size="2" weight="semi-bold" className="text-white/80">
                    Generated Content
                  </Text>
                </div>
                <Button
                  size="1"
                  variant="ghost"
                  className="text-white/40 hover:text-white"
                  onClick={resetGeneratedContent}
                >
                  Clear
                </Button>
              </div>
              <ContentCards
                items={generatedContent}
                onRegenerate={regenerateContent}
                onRefine={handleRefine}
                disabled={genContentLoading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
