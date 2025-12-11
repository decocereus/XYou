"use client";

import { useMemo, useState } from "react";
import { Button, Card, Text } from "@whop/react/components";
import {
  GeneratedContentItem,
  contentFormatCharLimit,
} from "@/lib/content-types";
import { Copy20, Sparkle20 } from "@frosted-ui/icons";
import { toast } from "sonner";

type ContentCardsProps = {
  items: GeneratedContentItem[];
  onRegenerate?: (id: string) => Promise<void> | void;
  onRefine?: (text: string) => void;
  disabled?: boolean;
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
        className="border border-dashed border-gray-200 dark:border-gray-800"
      >
        <div className="text-center flex flex-col items-center gap-y-3 py-3">
          <Text weight="semi-bold">No content generated yet</Text>
          <Text size="2" color="gray">
            Choose a format and click Generate to see results.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto py-6 flex flex-col gap-y-3 w-full">
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

  console.log("CONTENT CARD", item);

  return (
    <Card variant="classic" size="1" className="bg-white/5 border-white/10">
      {/* Header with actions only */}
      <div className="flex items-center justify-end gap-2 p-3 border-b border-white/10">
        <Button
          size="2"
          variant="ghost"
          color="gray"
          disabled={disabled || isLoading}
          onClick={() => onCopy(combinedText)}
          className="text-white/60 hover:text-white"
        >
          <Copy20 className="mr-1" /> Copy
        </Button>
        {onRefine && (
          <Button
            size="2"
            variant="ghost"
            color="blue"
            disabled={disabled || isLoading}
            onClick={() => onRefine(combinedText)}
            className="text-blue-400 hover:text-blue-300"
          >
            Send to chat
          </Button>
        )}
        {onRegenerate && (
          <Button
            size="2"
            variant="soft"
            color="purple"
            disabled={disabled || isLoading}
            onClick={() => onRegenerate(item.id)}
            loading={isLoading}
            className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
          >
            <Sparkle20 className="mr-1" /> Regenerate
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {displayContent.map((text, idx) => (
          <ThreadRow
            key={`${item.id}-${idx}`}
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
          <span className="text-xs text-white/40 font-semibold">{index}.</span>
        </div>
      )}
      <div className="flex-1 space-y-1">
        <Text className="leading-relaxed whitespace-pre-wrap text-white/90">
          {text}
        </Text>
        {charLimit && (
          <Text
            size="1"
            className={overLimit ? "text-red-400" : "text-white/30"}
          >
            {length}/{charLimit}
          </Text>
        )}
      </div>
    </div>
  );
}
