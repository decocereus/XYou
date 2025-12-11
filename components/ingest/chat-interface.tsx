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
  ContextMenu,
} from "@whop/react/components";
import { useIngest } from "@/providers/IngestProvider";
import { Copy20, LinkSlash20, Sparkle20, ArrowUp20 } from "@frosted-ui/icons";
import { toast } from "sonner";
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
  } = useIngest();

  const [selectedText, setSelectedText] = useState("");
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Content Gen State
  const [format, setFormat] = useState<ContentFormat>("tweet");
  const [tone, setTone] = useState<Tone>("viral");
  const [count, setCount] = useState<number>(defaultBatchSize["tweet"]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          context: transcript?.text || "",
        }),
      }),
    [transcript?.text]
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
            text: "I've analyzed the video! I can help you generate threads, tweets, or blog posts. What kind of content would you like to create?",
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
  }, [messages, generatedContent]); // Scroll when content changes

  // Handle text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (
        selection &&
        selection.toString().trim().length > 0 &&
        containerRef.current?.contains(selection.anchorNode)
      ) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Ensure we don't show context menu if selection is inside an input/textarea
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === "input" || activeTag === "textarea") return;

        setSelectedText(selection.toString());
        setSelectionRect(rect);
      } else {
        // Logic handled by click listener on container
      }
    };

    const handleMouseUp = () => {
      // Delay to ensure selection is final
      setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

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
    setInput(`Refine this: "${text}"`);
    // Optionally focus input
  };

  const handleRefineSelection = (tone: string) => {
    if (!selectedText) return;
    setInput(`Refine this text to be more ${tone}: "${selectedText}"`);
    setSelectedText("");
    setSelectionRect(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleGenerate = async () => {
    await generateContent({ format, tone, count });
  };

  return (
    <div
      className="relative w-full flex flex-col h-[600px] bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden"
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
    >
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
        <IconButton
          variant="ghost"
          className="text-white/40 hover:text-white"
          onClick={() => regenerate()}
        >
          <LinkSlash20 />
        </IconButton>
      </div>

      {/* Messages Area */}

      {/* Input Area */}
      <AnimatePresence>
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <div className="w-full overflow-y-auto relative">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
                aria-label="Chat transcript"
                onClick={() => {
                  // Clear selection if clicking on empty space
                  const selection = window.getSelection();
                  if (selection?.isCollapsed) {
                    setSelectedText("");
                    setSelectionRect(null);
                  }
                }}
              >
                {/* Generated Content Section (Merged) */}
                <AnimatePresence initial={false}>
                  {messages.map((message: UIMessage) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex flex-col gap-1 max-w-[85%] ${
                          message.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-none"
                              : "bg-white/10 text-white/90 border border-white/10 rounded-bl-none backdrop-blur-md"
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
                      <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none border border-white/10 flex gap-1.5 items-center h-12 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Separator className="w-full" />
              <div className="p-4 flex flex-col gap-3 w-full z-10">
                {/* Settings Toolbar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <Select.Root
                    value={format}
                    onValueChange={(value) => {
                      const f = value as ContentFormat;
                      setFormat(f);
                      setCount(defaultBatchSize[f]);
                    }}
                  >
                    <Select.Trigger className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors cursor-pointer appearance-none" />
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
                    <Select.Trigger className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors cursor-pointer appearance-none" />
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
                  <TextField.Root size="3" className="w-16">
                    <TextField.Input
                      type="number"
                      value={count}
                      onChange={(e) =>
                        setCount(
                          Math.min(20, Math.max(1, Number(e.target.value)))
                        )
                      }
                      className="w-16 bg-transparent text-xs font-medium text-white/80 focus:outline-none text-center"
                      min={1}
                      max={20}
                    />
                  </TextField.Root>

                  <Separator className="h-full mx-2 w-px" />

                  <Button
                    size="2"
                    className="h-8 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                    onClick={handleGenerate}
                    disabled={genContentLoading}
                    loading={genContentLoading}
                  >
                    <Sparkle20 className="mr-1.5 w-3.5 h-3.5" />
                    Generate
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="relative group w-full">
                  <TextArea
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask to generate a thread, specific tweet, or refine content..."
                    className="w-full pr-14 min-h-[60px] resize-none bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0 rounded-xl"
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
            </div>
          </ContextMenu.Trigger>
          {/* Floating Context Menu */}
          <ContextMenu.Content className="h-max w-max">
            <div className="flex items-end justify-between w-full">
              <ContextMenu.Item>Refine</ContextMenu.Item>
              <IconButton
                size="1"
                variant="ghost"
                className="text-white/60 hover:text-white"
                onClick={() => {
                  navigator.clipboard.writeText(selectedText);
                  toast.success("Copied!");
                  setSelectedText("");
                  setSelectionRect(null);
                  window.getSelection()?.removeAllRanges();
                }}
              >
                <Copy20 />
              </IconButton>
            </div>
            <ContextMenu.Separator />
            <ContextMenu.Item
              onClick={() => handleRefineSelection("professional")}
            >
              Professional
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => handleRefineSelection("funny")}>
              Funny
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => handleRefineSelection("viral")}>
              Viral
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      </AnimatePresence>

      <AnimatePresence>
        {generatedContent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full" />
                <Text size="2" weight="semi-bold" className="text-white/80">
                  Generated Content
                </Text>
              </div>
              <Button
                size="2"
                variant="ghost"
                className="text-white/40 hover:text-white hover:bg-white/10"
                onClick={resetGeneratedContent}
              >
                Clear
              </Button>
            </div>
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
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
