import { ApplicationStatus, MembershipStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { chatRoom, getSocketServer } from "../utils/socket";
import { prisma } from "../utils/prisma";

export const adminRouter = Router();

const updateApplicationSchema = z.object({
  status: z.enum([ApplicationStatus.VERIFIED, ApplicationStatus.REJECTED]),
  adminNote: z.string().max(500).optional()
});

const adminMessageSchema = z.object({
  body: z.string().min(1).max(3000)
});

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/applications", async (_req, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, email: true, membershipStatus: true } },
        paymentProof: true
      }
    });

    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get("/applications/:id", async (req, res, next) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, username: true, email: true, membershipStatus: true } },
        paymentProof: true
      }
    });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    return res.json({ application });
  } catch (error) {
    return next(error);
  }
});

adminRouter.patch("/applications/:id/status", async (req, res, next) => {
  try {
    const parsed = updateApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const application = await prisma.application.findUnique({ where: { id: req.params.id } });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const membershipStatus =
      parsed.data.status === ApplicationStatus.VERIFIED
        ? MembershipStatus.ACTIVE
        : MembershipStatus.REJECTED;

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: req.params.id },
        data: {
          status: parsed.data.status,
          adminNote: parsed.data.adminNote,
          reviewedBy: req.user!.id,
          reviewedAt: new Date()
        }
      });

      await tx.user.update({
        where: { id: application.userId },
        data: { membershipStatus }
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          targetUserId: application.userId,
          action: "APPLICATION_STATUS_UPDATED",
          metadata: {
            applicationId: application.id,
            status: parsed.data.status,
            adminNote: parsed.data.adminNote ?? null
          }
        }
      });

      return app;
    });

    return res.json({ application: updated });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get("/members", async (req, res, next) => {
  try {
    const statusParam = req.query.status as string | undefined;
    const whereStatus =
      statusParam && statusParam in MembershipStatus ? (statusParam as MembershipStatus) : undefined;

    const members = await prisma.user.findMany({
      where: {
        membershipStatus: whereStatus ?? MembershipStatus.ACTIVE
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        membershipStatus: true,
        isActive: true,
        createdAt: true
      }
    });

    return res.json({ members });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get("/chats", async (_req, res, next) => {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, username: true, email: true, membershipStatus: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { id: true, body: true, createdAt: true, senderId: true }
        }
      }
    });

    const chatIds = chats.map((chat) => chat.id);
    const unreadRows =
      chatIds.length > 0
        ? await prisma.message.groupBy({
            by: ["chatId"],
            where: {
              chatId: { in: chatIds },
              sender: { role: Role.USER },
              readAt: null
            },
            _count: { _all: true }
          })
        : [];

    const unreadMap = new Map(unreadRows.map((row) => [row.chatId, row._count._all]));
    const result = chats.map((chat) => ({
      id: chat.id,
      user: chat.user,
      lastMessageAt: chat.lastMessageAt,
      lastMessage: chat.messages[0] ?? null,
      unreadCount: unreadMap.get(chat.id) ?? 0
    }));

    return res.json({ chats: result });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get("/chats/:chatId/messages", async (req, res, next) => {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: req.params.chatId },
      include: { user: { select: { id: true, username: true, membershipStatus: true } } }
    });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, username: true, role: true } } }
    });

    await prisma.message.updateMany({
      where: {
        chatId: chat.id,
        sender: { role: Role.USER },
        readAt: null
      },
      data: { readAt: new Date() }
    });

    const io = getSocketServer();
    io?.to(chatRoom(chat.id)).emit("chat:read", { chatId: chat.id, readerRole: req.user!.role });

    return res.json({ chat, messages });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post("/chats/:chatId/messages", async (req, res, next) => {
  try {
    const parsed = adminMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { chatId: chat.id, senderId: req.user!.id, body: parsed.data.body },
        include: { sender: { select: { id: true, username: true, role: true } } }
      });

      await tx.chat.update({
        where: { id: chat.id },
        data: { lastMessageAt: message.createdAt }
      });

      return message;
    });

    const io = getSocketServer();
    io?.to(chatRoom(chat.id)).emit("chat:message", { chatId: chat.id, message: created });

    return res.status(201).json({ message: created });
  } catch (error) {
    return next(error);
  }
});

