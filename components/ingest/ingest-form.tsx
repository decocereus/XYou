"use client";

import { useIngest } from "@/providers/IngestProvider";
import { ArrowRight20, Youtube20 } from "@frosted-ui/icons";
import { Button, TextField } from "@whop/react/components";

export function IngestFormCard() {
  const { url, setUrl, canSubmit, submitIngest, status } = useIngest();

  return (
    <div className="w-full max-w-lg mx-auto py-12">
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-whop-primary/10 text-whop-primary mb-2">
            <Youtube20 className="w-6 h-6" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            yt2x
          </h1>

          <p className="text-lg text-gray-500 font-medium">
            Transform videos into viral content
          </p>

          <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            Paste any YouTube URL. Get tweets, threads, blogs, and summaries — ready to share.
          </p>
        </div>

        <div className="space-y-4">
          <TextField.Root
            size="3"
            className="w-full"
          >
            <TextField.Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="youtube.com/watch?v=..."
              className="w-full"
            />
          </TextField.Root>

          <Button
            size="3"
            variant="solid"
            onClick={submitIngest}
            disabled={!canSubmit}
            className="w-full"
            loading={status === "running" || status === "pending"}
          >
            <span className="flex items-center gap-2">
              Analyze Video
              <ArrowRight20 />
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}