import { describe, it, expect, beforeEach } from "vitest";

const mockGenerationsApi = async (headers: Record<string, string>, body: any) => {
  // Simulating the /v1/generations logic locally
  const idempotencyKey = headers["idempotency-key"];
  
  // mock cache
  if ((global as any).__mockDb?.[idempotencyKey]) {
      const stored = (global as any).__mockDb[idempotencyKey];
      if (stored.hash === JSON.stringify(body)) {
          return { status: 200, json: stored.res };
      } else {
          return { status: 409, json: { error: "Conflict" } };
      }
  }
  
  const result = { id: "gen_123", content: "..." };
  if (!(global as any).__mockDb) (global as any).__mockDb = {};
  (global as any).__mockDb[idempotencyKey] = { hash: JSON.stringify(body), res: result };
  return { status: 200, json: result };
};

describe("Idempotency Contract", () => {
  beforeEach(() => {
    (global as any).__mockDb = {};
  });

  it("returns same generation on identical call", async () => {
    const key = "test-uuid-1234";
    const body = { mode: "deterministic", type: "cv" };
    
    const req1 = await mockGenerationsApi({ "idempotency-key": key }, body);
    const req2 = await mockGenerationsApi({ "idempotency-key": key }, body);
    
    expect(req1.status).toBe(200);
    expect(req2.status).toBe(200);
    expect(req1.json).toEqual(req2.json);
  });

  it("returns 409 conflict when idempotency key reused with diff payload", async () => {
    const key = "test-uuid-5678";
    
    const req1 = await mockGenerationsApi({ "idempotency-key": key }, { p: 1 });
    const req2 = await mockGenerationsApi({ "idempotency-key": key }, { p: 2 });
    
    expect(req1.status).toBe(200);
    expect(req2.status).toBe(409);
  });
});
