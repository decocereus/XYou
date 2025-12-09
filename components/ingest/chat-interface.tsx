"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Button,
  Card,
  Text,
  TextArea,
  Avatar,
  IconButton,
} from "@whop/react/components";
import { useIngest } from "@/providers/IngestProvider";
import {
  Copy20,
  LinkSlash20,
  ShareNodes20,
  Sparkle20,
} from "@frosted-ui/icons";
import { toast } from "sonner";
import { DefaultChatTransport } from "ai";

type ChatInterfaceProps = {
  prefillInput?: string | null;
  onConsumePrefill?: () => void;
};

// Helper to extract text content from UIMessage parts
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
  const { transcript } = useIngest();
  const [selectedText, setSelectedText] = useState("");
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = globalThis.getSelection?.();
    if (selection && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(selection.toString());
      setSelectionRect(rect);
    } else {
      setSelectedText("");
      setSelectionRect(null);
    }
  }, []);

  useEffect(() => {
    const listener = () => handleMouseUp();
    globalThis.addEventListener?.("mouseup", listener);
    return () => globalThis.removeEventListener?.("mouseup", listener);
  }, [handleMouseUp]);

  // Consume external refinement prompts
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

  const handleRefineSelection = (tone: string) => {
    if (!selectedText) return;
    setInput(`Refine this text to be more ${tone}: "${selectedText}"`);
    setSelectedText("");
    setSelectionRect(null);
  };

  return (
    <div className="relative w-full flex flex-col gap-4">
      <Card variant="classic" size="4" className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkle20 />
            </div>
            <div>
              <Text weight="semi-bold" className="text-white">
                Content Assistant
              </Text>
              <Text size="1" color="gray">
                Powered by AI Analysis
              </Text>
            </div>
          </div>
          <IconButton variant="ghost" color="gray" onClick={() => regenerate()}>
            <LinkSlash20 />
          </IconButton>
        </div>

        {/* Messages Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
          aria-label="Chat transcript"
        >
          {messages.map((message: UIMessage) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={message.id}
              className={`flex gap-4 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar
                src={
                  message.role === "user"
                    ? undefined
                    : "https://api.dicebear.com/7.x/bottts/svg?seed=ai"
                }
                fallback={message.role === "user" ? "ME" : "AI"}
                color={message.role === "user" ? "gray" : "blue"}
                size="2"
              />
              <div
                className={`flex flex-col gap-1 max-w-[80%] ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-accent-6 text-white rounded-br-none"
                      : "bg-background text-gray-200 border border-white/5 rounded-bl-none"
                  }`}
                >
                  {getMessageContent(message)}
                </div>
              </div>
            </motion.div>
          ))}
          {isBusy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <Avatar fallback="AI" color="blue" size="2" />
              <div className="bg-white/5 p-4 rounded-2xl rounded-bl-none border border-white/5 flex gap-1 items-center h-12">
                <span
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <TextArea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask to generate a thread, specific tweet, or refine content..."
            className="w-full pr-12 min-h-[60px] focus:border-blue-500/50 rounded-xl resize-none"
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
              color="blue"
              size="2"
              className="rounded-lg"
            >
              <ShareNodes20 />
            </IconButton>
          </div>
        </form>
      </Card>

      {/* Floating Context Menu */}
      <AnimatePresence>
        {selectedText && selectionRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-50 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-2 flex gap-2 items-center"
            style={{
              top: selectionRect.top - 60, // Position above text
              left: selectionRect.left + selectionRect.width / 2 - 150, // Center horizontally
            }}
          >
            <span className="text-xs font-semibold text-gray-400 px-2">
              Refine:
            </span>
            <Button
              size="1"
              variant="soft"
              onClick={() => handleRefineSelection("professional")}
            >
              Prof.
            </Button>
            <Button
              size="1"
              variant="soft"
              onClick={() => handleRefineSelection("funny")}
            >
              Funny
            </Button>
            <Button
              size="1"
              variant="soft"
              onClick={() => handleRefineSelection("viral")}
            >
              Viral
            </Button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <Button
              size="1"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(selectedText);
                toast.success("Copied!");
                setSelectedText("");
              }}
            >
              <Copy20 />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
