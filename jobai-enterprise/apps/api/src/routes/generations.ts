import express, { Request, Response } from "express";

export const generationsRoute = express.Router();

// Mock store for idempotency test implementation
const mockDb: Record<string, any> = {};

generationsRoute.post("/", async (req: Request, res: Response) => {
  const idempotencyKey = req.headers["idempotency-key"] as string;
  const clientRequestId = req.headers["x-client-request-id"] as string;

  if (!idempotencyKey || !clientRequestId) {
    return res.status(400).json({ error: "Missing required headers" });
  }

  const { documentType, mode, jobSourceId, userStableId } = req.body;

  // Idempotency check
  if (mockDb[idempotencyKey]) {
    const previousPayloadHash = mockDb[idempotencyKey].payloadHash;
    const currentPayloadHash = JSON.stringify(req.body);

    if (previousPayloadHash === currentPayloadHash) {
      return res.json(mockDb[idempotencyKey].result); // Same key + same payload = same result
    } else {
      return res.status(409).json({ error: "Idempotency key reuse on different payload" }); // Conflict
    }
  }

  // Simulate usage events and generation logic
  const generationId = `gen_${Date.now()}_${Math.random()}`;

  const result = {
    id: generationId,
    content: `Generated ${documentType} content for ${jobSourceId}`,
    usage: {
      prompt_tokens: 1500,
      completion_tokens: 300,
      total_tokens: 1800,
      cost_credits: 0.008,
    }
  };

  mockDb[idempotencyKey] = {
    payloadHash: JSON.stringify(req.body),
    result
  };

  res.json(result);
});

generationsRoute.get("/:id", (req: Request, res: Response) => {
  // Fetch result logic
  res.json({ id: req.params.id, status: "completed" });
});
