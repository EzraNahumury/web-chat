import type { Server as HttpServer } from "http";
import { Role } from "@prisma/client";
import { Server } from "socket.io";
import { verifyAuthToken } from "./jwt";
import { prisma } from "./prisma";

let io: Server | null = null;

type SocketUser = {
  id: string;
  role: Role;
};

const ADMIN_ROOM = "staff";

export function initSocket(server: HttpServer) {
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  io = new Server(server, {
    cors: { origin: corsOrigin }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const payload = verifyAuthToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, isActive: true }
      });
      if (!user || !user.isActive) {
        return next(new Error("Unauthorized"));
      }
      socket.data.user = { id: user.id, role: user.role } as SocketUser;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as SocketUser;

    if (user.role === Role.ADMIN || user.role === Role.FOUNDER) {
      socket.join(ADMIN_ROOM);
    }

    if (user.role === Role.USER) {
      const chat = await prisma.chat.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (chat) {
        socket.join(chatRoom(chat.id));
      }
    }

    socket.on("chat:join", async (chatId: string) => {
      if (user.role !== Role.ADMIN && user.role !== Role.FOUNDER) {
        return;
      }
      socket.join(chatRoom(chatId));
    });
  });

  return io;
}

export function chatRoom(chatId: string) {
  return `chat:${chatId}`;
}

export function staffRoom() {
  return ADMIN_ROOM;
}

export function getSocketServer() {
  return io;
}

