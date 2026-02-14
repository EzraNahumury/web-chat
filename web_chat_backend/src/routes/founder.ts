import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireFounder } from "../middleware/auth";
import { prisma } from "../utils/prisma";

export const founderRouter = Router();

const promoteSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional()
});

const setAdminActiveSchema = z.object({
  isActive: z.boolean()
});

founderRouter.use(requireAuth, requireFounder);

founderRouter.get("/admins", async (_req, res, next) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: [Role.FOUNDER, Role.ADMIN] } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    return res.json({ admins });
  } catch (error) {
    return next(error);
  }
});

founderRouter.post("/admins", async (req, res, next) => {
  try {
    const parsed = promoteSchema.safeParse(req.body);
    if (!parsed.success || (!parsed.data.userId && !parsed.data.email)) {
      return res.status(400).json({ message: "Provide userId or email", errors: parsed.success ? null : parsed.error.flatten() });
    }

    const user = await prisma.user.findFirst({
      where: parsed.data.userId ? { id: parsed.data.userId } : { email: parsed.data.email! }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const adminUser = await tx.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN, isActive: true },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          targetUserId: user.id,
          action: "ADMIN_PROMOTED",
          metadata: { previousRole: user.role }
        }
      });

      return adminUser;
    });

    return res.status(201).json({ admin: updated });
  } catch (error) {
    return next(error);
  }
});

founderRouter.patch("/admins/:id/active", async (req, res, next) => {
  try {
    const parsed = setAdminActiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.role !== Role.ADMIN) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.update({
        where: { id: req.params.id },
        data: { isActive: parsed.data.isActive },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          targetUserId: req.params.id,
          action: "ADMIN_STATUS_CHANGED",
          metadata: { isActive: parsed.data.isActive }
        }
      });

      return admin;
    });

    return res.json({ admin: updated });
  } catch (error) {
    return next(error);
  }
});

founderRouter.get("/audit-logs", async (req, res, next) => {
  try {
    const limitRaw = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: { select: { id: true, username: true, role: true } },
        targetUser: { select: { id: true, username: true, role: true } }
      }
    });

    return res.json({ logs });
  } catch (error) {
    return next(error);
  }
});

