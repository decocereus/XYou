"use client";

import { useMemo, useState } from "react";
import { Button, Card, Text } from "@whop/react/components";
import {
  ContentFormat,
  GeneratedContentItem,
  contentFormatCharLimit,
  contentFormatLabels,
} from "@/lib/content-types";
import { Copy20, ShareNodes20, Sparkle20 } from "@frosted-ui/icons";
import { toast } from "sonner";

type ContentCardsProps = {
  items: GeneratedContentItem[];
  onRegenerate?: (id: string) => Promise<void> | void;
  onRefine?: (text: string) => void;
  disabled?: boolean;
};

const formatAccent: Record<ContentFormat, string> = {
  tweet: "text-blue-300 bg-blue-500/10",
  thread: "text-purple-300 bg-purple-500/10",
  linkedin: "text-sky-300 bg-sky-500/10",
  shorts: "text-pink-300 bg-pink-500/10",
};

export function ContentCards({
  items,
  onRegenerate,
  onRefine,
  disabled,
}: Readonly<ContentCardsProps>) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleRegenerate = async (id: string) => {
    if (!onRegenerate) return;
    setLoadingId(id);
    try {
      await onRegenerate(id);
    } finally {
      setLoadingId(null);
    }
  };

  if (!items.length) {
    return (
      <Card
        variant="classic"
        size="3"
        className="border border-dashed border-white/10 bg-white/5 backdrop-blur-xl"
      >
        <div className="text-center  flex flex-col items-center gap-y-3 py-3">
          <Text weight="semi-bold" className="text-white">
            No content generated yet
          </Text>
          <Text size="2" color="gray">
            Choose a format and click Generate to see results.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-h-[200px] overflow-y-scroll py-6 flex flex-col gap-y-3 w-full">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          onCopy={handleCopy}
          onRegenerate={handleRegenerate}
          onRefine={onRefine}
          isLoading={loadingId === item.id}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function ContentCard({
  item,
  onCopy,
  onRegenerate,
  onRefine,
  isLoading,
  disabled,
}: Readonly<{
  item: GeneratedContentItem;
  onCopy: (text: string) => void;
  onRegenerate?: (id: string) => void | Promise<void>;
  onRefine?: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}>) {
  const charLimit = contentFormatCharLimit[item.format];
  const displayContent = useMemo(() => {
    if (item.parts?.length) {
      return item.parts;
    }
    return [item.content];
  }, [item.content, item.parts]);

  const combinedText = item.parts?.length
    ? item.parts.map((p, idx) => `${idx + 1}. ${p}`).join("\n")
    : item.content;

  return (
    <Card variant="classic" size="1">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          {item.tone && (
            <span className="text-xs text-3 uppercase text-white-surface">
              {item.tone}
            </span>
          )}
          <Button
            size="2"
            variant="ghost"
            color="gray"
            disabled={disabled || isLoading}
            onClick={() => onCopy(combinedText)}
          >
            <Copy20 /> Copy
          </Button>
          {onRefine && (
            <Button
              size="2"
              variant="ghost"
              color="blue"
              disabled={disabled || isLoading}
              onClick={() => onRefine(combinedText)}
            >
              <ShareNodes20 /> Send to chat
            </Button>
          )}
          {onRegenerate && (
            <Button
              size="2"
              color="purple"
              disabled={disabled || isLoading}
              onClick={() => onRegenerate(item.id)}
              loading={isLoading}
            >
              <Sparkle20 /> Regenerate
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {displayContent.map((text, idx) => (
          <ThreadRow
            key={text}
            index={item.format === "thread" ? idx + 1 : undefined}
            text={text}
            charLimit={charLimit}
          />
        ))}
      </div>
    </Card>
  );
}

function ThreadRow({
  index,
  text,
  charLimit,
}: Readonly<{
  index?: number;
  text: string;
  charLimit?: number;
}>) {
  const length = text.length;
  const overLimit = charLimit ? length > charLimit : false;
  return (
    <div className="flex gap-3">
      {index !== undefined && (
        <div className="mt-1">
          <span className="text-xs text-gray-400 font-semibold">{index}.</span>
        </div>
      )}
      <div className="flex-1 space-y-1">
        <Text className="text-white leading-relaxed whitespace-pre-wrap">
          {text}
        </Text>
        {charLimit && (
          <Text
            size="1"
            className={overLimit ? "text-red-300" : "text-gray-400"}
          >
            {length}/{charLimit} characters
          </Text>
        )}
      </div>
    </div>
  );
}
