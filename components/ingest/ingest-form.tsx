"use client";

import { Button, Card, Text, TextField } from "@whop/react/components";
import { useIngest } from "@/providers/IngestProvider";

export function IngestFormCard() {
  const { url, setUrl, canSubmit, submitIngest, status } = useIngest();

  return (
    <Card variant="classic" size="4" className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col items-start gap-y-4">
          <Text as="label" size="3" weight="semi-bold">
            YouTube URL
          </Text>
          <TextField.Root size="3" variant="surface" className="w-full">
            <TextField.Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full"
            />
          </TextField.Root>
        </div>

        <div className="flex flex-col gap-3 rounded-xl shadow-sm">
          <Button
            size="3"
            variant="solid"
            color="blue"
            onClick={submitIngest}
            disabled={!canSubmit}
            className="w-full"
            loading={status === "running"}
          >
            Continue
          </Button>
        </div>
      </div>
    </Card>
  );
}
