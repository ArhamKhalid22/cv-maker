export type LLMRole = "system" | "user" | "assistant" | "tool";

export type LLMMessage = {
  role: LLMRole;
  content: string;
};

export type LLMMode = "deterministic" | "creative";

export type LLMRequest = {
  messages: LLMMessage[];
  modelHint?: string;
  mode: LLMMode;
  maxOutputTokens: number;
  temperature?: number;
  seed?: number | null;
  userStableId: string;
  sessionId?: string;
  trace?: Record<string, unknown>;
  privacy: { zdrRequired: boolean };
  budget: { maxCreditsPerRequest?: number };
};

export type LLMUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costCredits?: number;
  cachedTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
};

export type LLMResponse = {
  text: string;
  model: string;
  provider: "openrouter" | "openai" | "ollama" | "vllm" | "hf";
  rawId?: string;
  usage?: LLMUsage;
  systemFingerprint?: string;
};

export interface LLMClient {
  generate(req: LLMRequest, ctx: { requestId: string; clientRequestId: string }): Promise<LLMResponse>;
  stream?(req: LLMRequest, ctx: { requestId: string; clientRequestId: string }): AsyncIterable<{ deltaText?: string; final?: LLMResponse; error?: any }>;
}
