import { IngestFormCard } from "./ingest/ingest-form";
import { VideoPreviewCard } from "./ingest/video-preview-card";
import { TranscriptActions } from "./ingest/transcript-actions";
import { TweetGenerator } from "./ingest/tweet-generator";
import { ThreadResults } from "./ingest/thread-result";
import { IngestProvider } from "@/providers/IngestProvider";

export default function Ingest() {
  return (
    <IngestProvider>
      <div className="max-w-6xl space-y-5 rounded-2xl py-6 shadow-sm">
        <IngestFormCard />
        <VideoPreviewCard />
        <TranscriptActions />
        <TweetGenerator />
        <ThreadResults />
      </div>
    </IngestProvider>
  );
}
