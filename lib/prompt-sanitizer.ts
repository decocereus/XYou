/**
 * Prompt Sanitization Utilities
 *
 * Protects against prompt injection attacks by sanitizing user inputs
 * before they are injected into AI prompts.
 */

// Dangerous patterns that could be used for prompt injection
const INJECTION_PATTERNS = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/gi,
  /disregard\s+(all\s+)?(previous|above|prior|earlier)/gi,
  /forget\s+(all\s+)?(previous|above|prior|earlier)/gi,

  // Role/identity manipulation
  /you\s+are\s+now/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /act\s+as\s+(if\s+you\s+are|a)/gi,
  /from\s+now\s+on/gi,

  // System prompt markers
  /\[?\s*system\s*[:\]]/gi,
  /\[?\s*assistant\s*[:\]]/gi,
  /\[?\s*user\s*[:\]]/gi,
  /<<\s*SYS\s*>>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,

  // Instruction injection
  /new\s+instructions?\s*:/gi,
  /override\s*:/gi,
  /admin\s+mode/gi,
  /developer\s+mode/gi,
  /jailbreak/gi,
  /DAN\s+mode/gi,

  // Output manipulation
  /print\s+the\s+(system\s+)?prompt/gi,
  /reveal\s+(your\s+)?(system\s+)?instructions/gi,
  /show\s+(your\s+)?hidden/gi,

  // Delimiter exploitation
  /```\s*system/gi,
  /\{\{\s*system/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
];

// Characters that could break JSON or prompt structure
const SPECIAL_CHARS_MAP: Record<string, string> = {
  "\\": "\\\\",
  '"': String.raw`\"`,
  "\n": " ", // Replace newlines with spaces in single-line contexts
  "\r": "",
  "\t": " ",
};

/**
 * Check if input contains potential injection patterns
 */
export function containsInjectionPattern(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Remove dangerous injection patterns from input
 */
export function stripInjectionPatterns(input: string): string {
  let sanitized = input;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }
  return sanitized;
}

/**
 * Escape special characters for safe JSON embedding
 */
export function escapeForJson(input: string): string {
  let escaped = input;
  for (const [char, replacement] of Object.entries(SPECIAL_CHARS_MAP)) {
    escaped = escaped.split(char).join(replacement);
  }
  return escaped;
}

/**
 * Normalize whitespace (collapse multiple spaces, trim)
 */
export function normalizeWhitespace(input: string): string {
  return input.replaceAll(/\s+/g, " ").trim();
}

/**
 * Main sanitization function for user inputs going into prompts
 *
 * @param input - Raw user input
 * @param options - Sanitization options
 * @returns Sanitized string safe for prompt injection
 */
export function sanitizePromptInput(
  input: string,
  options: {
    maxLength?: number;
    preserveNewlines?: boolean;
    strictMode?: boolean;
  } = {}
): string {
  const {
    maxLength = 2000,
    preserveNewlines = false,
    strictMode = true,
  } = options;

  if (!input || typeof input !== "string") {
    return "";
  }

  let sanitized = input;

  // 1. Strip injection patterns
  if (strictMode) {
    sanitized = stripInjectionPatterns(sanitized);
  }

  // 2. Handle whitespace
  if (!preserveNewlines) {
    sanitized = sanitized.replaceAll(/[\r\n]+/g, " ");
  }
  sanitized = normalizeWhitespace(sanitized);

  // 3. Escape special characters
  sanitized = escapeForJson(sanitized);

  // 4. Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize an array of strings (e.g., example tweets)
 */
export function sanitizePromptInputArray(
  inputs: string[],
  options: {
    maxLength?: number;
    maxItems?: number;
  } = {}
): string[] {
  const { maxLength = 500, maxItems = 20 } = options;

  return inputs
    .slice(0, maxItems)
    .map((input) => sanitizePromptInput(input, { maxLength }))
    .filter((s) => s.length > 0);
}

/**
 * Sanitize a style/purpose description from user
 */
export function sanitizeStyleInput(input: string): string {
  return sanitizePromptInput(input, {
    maxLength: 1000,
    preserveNewlines: true,
    strictMode: true,
  });
}

/**
 * Sanitize topic/purpose for content generation
 */
export function sanitizePurposeInput(input: string): string {
  return sanitizePromptInput(input, {
    maxLength: 500,
    preserveNewlines: false,
    strictMode: true,
  });
}

/**
 * Validate and report if input was modified during sanitization
 */
export function validateAndSanitize(input: string): {
  sanitized: string;
  wasModified: boolean;
  hadInjectionPattern: boolean;
} {
  const hadInjectionPattern = containsInjectionPattern(input);
  const sanitized = sanitizePromptInput(input);
  const wasModified = sanitized !== input;

  return {
    sanitized,
    wasModified,
    hadInjectionPattern,
  };
}
