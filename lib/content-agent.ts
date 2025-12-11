import { contentAgentTools } from "./agent-tools";
import { openrouter } from "./openrouter";
import { sanitizePromptInput } from "./prompt-sanitizer";

// Model configuration
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || "claude-sonnet-4-5";

// Get the right model provider based on model name
function getModel(modelName: string) {
  return openrouter.chat(modelName);
}

// Agent system prompt
export const AGENT_SYSTEM_PROMPT = `You are an expert content creation assistant. Your job is to help users create high-quality social media content, especially tweets and video scripts.

## Your Capabilities
1. **Analyze Writing Style**: You can analyze example tweets to understand a user's preferred writing style.
2. **Generate Tweets**: Create engaging, viral-quality tweets from transcripts or topics.
3. **Generate Scripts**: Write video scripts matching a specific style on new topics.
4. **Critique & Refine**: Review and improve generated content for maximum impact.

## Content Quality Standards
- NEVER use emojis
- NEVER use em-dashes (—)
- NEVER use hashtags
- Write like a human, not an AI
- Use contractions naturally (don't, won't, it's)
- Vary sentence length for rhythm
- One idea per post
- Start with the insight, not setup

## Workflow
When a user wants to generate content:
1. If they provide example tweets, first analyze the style using the analyzeWritingStyle tool
2. Use the appropriate generation tool (generateTweets or generateScript)
3. Optionally critique and refine the results for quality

## Communication Style
- Be concise and helpful
- Focus on delivering results, not explaining your process
- If you need more information, ask specific questions
- Present generated content clearly for easy copying

Always prioritize quality over quantity. It's better to produce 3 excellent tweets than 10 mediocre ones.`;

// Export agent configuration for use in API routes
export const contentAgentConfig = {
  model: getModel(GENERATOR_MODEL),
  system: AGENT_SYSTEM_PROMPT,
  tools: contentAgentTools,
  maxSteps: 5,
};

// Type for style profile used across the app
export type StyleProfile = {
  tone: string;
  vocabulary: string;
  sentenceStructure: string;
  hooks: string;
  patterns: string[];
  summary: string;
};

// Helper to build context message with transcript
export function buildContextMessage(
  transcript: string,
  styleProfile?: StyleProfile
): string {
  let context = `Here is the transcript to work with:\n\n${sanitizePromptInput(transcript, { maxLength: 50000, preserveNewlines: true })}`;

  if (styleProfile) {
    context += `\n\n## Writing Style to Emulate
- Tone: ${styleProfile.tone}
- Vocabulary: ${styleProfile.vocabulary}
- Sentence Structure: ${styleProfile.sentenceStructure}
- Hook Patterns: ${styleProfile.hooks}
- Key Patterns: ${styleProfile.patterns.join(", ")}
- Summary: ${styleProfile.summary}`;
  }

  return context;
}
