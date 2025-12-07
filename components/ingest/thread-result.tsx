"use client";

import { useIngest } from "@/providers/IngestProvider";
import { Card, Separator, Text } from "@whop/react/components";

export function ThreadResults() {
  const { threads } = useIngest();

  if (!threads) return null;

  return (
    <Card variant="surface" size="4" className="space-y-4">
      {threads.summary && (
        <div className="space-y-2">
          <Text size="4" weight="semi-bold">
            Summary
          </Text>
          <ul className="list-disc space-y-1 pl-5 text-3 text-gray-12">
            {threads.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {threads.threads && (
        <div className="space-y-4">
          <Separator />
          {Object.entries(threads.threads).map(([style, tweets]) => (
            <div key={style} className="space-y-2">
              <Text size="4" weight="semi-bold" className="capitalize">
                {`${style} thread`}
              </Text>
              <ol className="list-decimal space-y-1 pl-5 text-3 text-gray-12">
                {tweets.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {threads.raw && (
        <>
          <Separator />
          <pre className="overflow-x-auto rounded-lg border border-gray-a5 bg-gray-a2 p-3 text-2">
            {threads.raw}
          </pre>
        </>
      )}
    </Card>
  );
}
