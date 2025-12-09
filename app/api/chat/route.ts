import { openai } from "@ai-sdk/openai";
import { streamText, type UIMessage, convertToModelMessages } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, context } = (await req.json()) as {
    messages: UIMessage[];
    context: string;
  };

  // Add the context (transcript) to the system message
  const systemMessage = `
    You are an expert social media manager and viral content creator.
    Your goal is to help the user create engaging Twitter threads and posts based on the provided video transcript.
    
    Here is the transcript of the video:
    "${context}"

    Analyze the transcript and help the user generate content.
    When generating threads, use a hook-body-CTA structure.
    Keep the tone consistent with the user's request.
    If the user selects text to update, focus only on refining that specific part while maintaining flow.
  `;

  // Convert UI messages to model messages format
  const modelMessages = convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemMessage,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
