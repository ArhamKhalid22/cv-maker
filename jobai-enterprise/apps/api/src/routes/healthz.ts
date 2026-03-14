import express, { Request, Response } from "express";

export const healthzRoute = express.Router();

healthzRoute.get("/", (req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});
