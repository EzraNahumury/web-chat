import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { chatRoom, getSocketServer, staffRoom } from "../utils/socket";
import { prisma } from "../utils/prisma";

export const chatRouter = Router();

const messageSchema = z.object({
  body: z.string().min(1).max(3000)
});

chatRouter.get("/my-room", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const chat = await prisma.chat.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true, user: { select: { id: true, username: true } }, lastMessageAt: true, createdAt: true, updatedAt: true }
    });

    await prisma.message.updateMany({
      where: {
        chatId: chat.id,
        sender: { role: { in: [Role.ADMIN, Role.FOUNDER] } },
        readAt: null
      },
      data: { readAt: new Date() }
    });

    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, username: true, role: true } }
      }
    });

    return res.json({ chat, messages });
  } catch (error) {
    return next(error);
  }
});

chatRouter.post("/my-room/messages", requireAuth, async (req, res, next) => {
  try {
    if (req.user!.role !== "USER") {
      return res.status(403).json({ message: "Only member users can send in this endpoint" });
    }

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const userId = req.user!.id;
    const chat = await prisma.chat.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });

    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { chatId: chat.id, senderId: userId, body: parsed.data.body },
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
    io?.to(staffRoom()).emit("chat:updated", {
      chatId: chat.id,
      userId,
      lastMessageAt: created.createdAt
    });

    return res.status(201).json({ message: created, chatId: chat.id });
  } catch (error) {
    return next(error);
  }
});
