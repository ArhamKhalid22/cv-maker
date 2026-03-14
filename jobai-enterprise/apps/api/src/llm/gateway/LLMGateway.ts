import { LLMClient, LLMRequest, LLMResponse } from "../../../../packages/shared/src/llm/types";

export class LLMGateway {
  constructor(
    private openRouterClient: LLMClient,
    private fallbackClients: Record<string, LLMClient> = {}
  ) {}

  async generate(req: LLMRequest, ctx: { requestId: string; clientRequestId: string }): Promise<LLMResponse> {
    try {
      // Primary: Try OpenRouter routing
      return await this.openRouterClient.generate(req, ctx);
    } catch (e: any) {
      if (e.status === 429) {
        console.warn(`[LLMGateway] OpenRouter Rate Limited (429) for request ${ctx.requestId}. Failing over or backing off.`);
      } else if (e.status === 503) {
        console.warn(`[LLMGateway] OpenRouter No Providers (503) for request ${ctx.requestId}. Failing over.`);
      } else {
        console.error(`[LLMGateway] Unexpected Error: ${e.message}`);
      }
      
      // Fallback
      if (this.fallbackClients["vllm"]) {
        console.log(`[LLMGateway] Trying vLLM fallback...`);
        return await this.fallbackClients["vllm"].generate(req, ctx);
      }
      if (this.fallbackClients["openai"]) {
        console.log(`[LLMGateway] Trying OpenAI fallback...`);
        return await this.fallbackClients["openai"].generate(req, ctx);
      }

      throw new Error(`All LLM providers failed. Last error: ${e.message}`);
    }
  }
}
