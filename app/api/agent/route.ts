import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { contentAgentTools } from "@/lib/agent-tools";
import {
  AGENT_SYSTEM_PROMPT,
  buildContextMessage,
  type StyleProfile,
} from "@/lib/content-agent";
import { sanitizePromptInput } from "@/lib/prompt-sanitizer";
import { openrouter } from "@/lib/openrouter";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// Model configuration
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || "claude-sonnet-4-5";

// Get the right model provider based on model name
function getModel(modelName: string) {
  return openrouter.chat(modelName);
}

// Request body type
type AgentRequestBody = {
  messages: UIMessage[];
  context?: string; // Transcript or other context
  styleProfile?: StyleProfile;
  purpose?: string;
};

export async function POST(req: Request) {
  try {
    const body: AgentRequestBody = await req.json();
    const { messages, context, styleProfile, purpose } = body;

    // Build the system prompt with context
    let systemPrompt = AGENT_SYSTEM_PROMPT;

    if (context) {
      systemPrompt += `\n\n## Current Context\n${buildContextMessage(
        context,
        styleProfile
      )}`;
    }

    if (purpose) {
      systemPrompt += `\n\n## Content Purpose\nThe user wants to create content for: ${sanitizePromptInput(purpose)}`;
    }

    // Convert UI messages to model format
    const modelMessages = convertToModelMessages(messages);

    // Stream the response with tools
    const result = streamText({
      model: getModel(GENERATOR_MODEL),
      system: systemPrompt,
      messages: modelMessages,
      tools: contentAgentTools,
      temperature: 0.7,
    });

    // Return as UI message stream
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Agent error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Agent failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
