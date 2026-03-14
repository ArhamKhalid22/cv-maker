import { LLMClient, LLMRequest, LLMResponse, LLMMessage } from "../../../../packages/shared/src/llm/types";

export type ORMessage = { role: "system" | "user" | "assistant" | "tool"; content: any; name?: string; tool_call_id?: string };

export type OpenRouterChatRequest = {
  model?: string;
  models?: string[]; // fallbacks
  messages: ORMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  seed?: number | null;
  response_format?: { type: "json_object" } | { type: "json_schema"; json_schema: { name: string; strict?: boolean; schema: object } };
  provider?: {
    zdr?: boolean;
    sort?: any;
    max_price?: any;
    allow_fallbacks?: boolean;
  };
  user?: string;
  session_id?: string;
  trace?: Record<string, unknown>;
};

export type OpenRouterChatResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{ index: number; finish_reason: string; message: { role: string; content: string } }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  system_fingerprint?: string;
};

export class OpenRouterProvider implements LLMClient {
  constructor(
    private apiKey: string,
    private appUrl?: string,
    private appTitle?: string
  ) {}

  async generate(req: LLMRequest, ctx: { requestId: string; clientRequestId: string }): Promise<LLMResponse> {
    const defaultModel = req.modelHint || "openai/gpt-4o-mini";
    
    // Convert to OpenRouter-specific format
    const orReq: OpenRouterChatRequest = {
      model: defaultModel,
      messages: req.messages.map(m => ({ role: m.role, content: m.content })),
      temperature: req.temperature ?? (req.mode === "deterministic" ? 0.0 : 0.8),
      max_tokens: req.maxOutputTokens,
      seed: req.mode === "deterministic" && req.seed != null ? req.seed : undefined,
      user: req.userStableId,
      session_id: req.sessionId,
      trace: req.trace,
      provider: {
        zdr: req.privacy.zdrRequired,
        ...(req.budget.maxCreditsPerRequest ? { max_price: req.budget.maxCreditsPerRequest } : {})
      }
    };

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(this.appUrl ? { "HTTP-Referer": this.appUrl } : {}),
        ...(this.appTitle ? { "X-OpenRouter-Title": this.appTitle } : {}),
        "X-Request-Id": ctx.requestId,
        "X-Client-Request-Id": ctx.clientRequestId,
      },
      body: JSON.stringify(orReq),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw Object.assign(new Error(`OpenRouter error ${resp.status}`), { status: resp.status, err });
    }

    const data = (await resp.json()) as OpenRouterChatResponse;
    const choice = data.choices[0];
    
    return {
      text: choice.message.content || "",
      model: data.model || defaultModel,
      provider: "openrouter",
      rawId: data.id,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        costCredits: data.usage.cost
      },
      systemFingerprint: data.system_fingerprint
    };
  }
}
