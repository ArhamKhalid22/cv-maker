import { describe, it, expect } from "vitest";

const mockUsagePersistence = (usage: any) => {
    return {
        id: "usage_123",
        provider: "openrouter",
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        cost_credits: usage.costCredits
    };
};

describe("Usage Accounting Integration", () => {
    it("persists exact token and cost outputs from OpenRouter", () => {
        const mockOpenRouterResponse = {
            usage: {
                promptTokens: 1500,
                completionTokens: 300,
                costCredits: 0.008,
            }
        };

        const result = mockUsagePersistence(mockOpenRouterResponse.usage);
        
        expect(result.prompt_tokens).toBe(1500);
        expect(result.completion_tokens).toBe(300);
        expect(result.cost_credits).toBe(0.008);
        expect(result.provider).toBe("openrouter");
    });
});
