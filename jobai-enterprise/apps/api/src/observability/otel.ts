import { trace, metrics } from "@opentelemetry/api";

const tracer = trace.getTracer("jobai-pro-api");
const meter = metrics.getMeter("jobai-pro-api");

export const generationMetrics = {
    requestsTotal: meter.createCounter("cvapp_llm_requests_total"),
    costCreditsTotal: meter.createCounter("cvapp_llm_cost_credits_total"),
    tokensTotal: meter.createCounter("cvapp_llm_tokens_total"),
    regenClicksTotal: meter.createCounter("cvapp_regen_clicks_total"),
    httpRequestsTotal: meter.createCounter("cvapp_http_requests_total")
};

export const createSpan = (name: string, attributes?: Record<string, string | number | boolean>) => {
    return tracer.startSpan(name, { attributes });
};
