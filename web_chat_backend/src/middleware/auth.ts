import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../utils/jwt";
import { prisma } from "../utils/prisma";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true }
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Account inactive or not found" });
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "FOUNDER")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
}

export function requireFounder(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "FOUNDER") {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
}
