import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "web_chat_backend",
    timestamp: new Date().toISOString()
  });
});

