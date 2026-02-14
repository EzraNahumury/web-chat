import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { signAuthToken } from "../utils/jwt";

export const authRouter = Router();

const signupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only use letters, numbers, and underscore"),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

authRouter.post("/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const { username, email, password } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      },
      select: { email: true, username: true }
    });
    if (existing?.email === email) {
      return res.status(409).json({ message: "Email already registered" });
    }
    if (existing?.username === username) {
      return res.status(409).json({ message: "Username already used" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, role: Role.USER, chat: { create: {} } },
      select: { id: true, username: true, email: true, role: true, membershipStatus: true }
    });

    const token = signAuthToken({ userId: user.id, role: user.role });
    return res.status(201).json({
      token,
      user
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        membershipStatus: true,
        passwordHash: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signAuthToken({ userId: user.id, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        membershipStatus: user.membershipStatus
      }
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});
