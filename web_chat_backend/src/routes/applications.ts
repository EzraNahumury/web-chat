import { ApplicationStatus, MembershipStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../utils/prisma";

export const applicationsRouter = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedFileTypes = ["image/jpeg", "image/png", "application/pdf"] as const;

const createApplicationSchema = z.object({
  senderBankAccountName: z.string().min(2).max(120),
  bankName: z.string().min(2).max(80),
  transferDate: z.coerce.date(),
  amount: z.number().int().min(200000),
  paymentProof: z.object({
    fileUrl: z.string().url(),
    fileType: z.enum(allowedFileTypes),
    fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE)
  })
});

applicationsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = createApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const userId = req.user!.id;
    const existingPending = await prisma.application.findFirst({
      where: { userId, status: ApplicationStatus.PENDING },
      select: { id: true }
    });
    if (existingPending) {
      return res.status(409).json({ message: "You already have a pending application" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          userId,
          senderBankAccountName: parsed.data.senderBankAccountName,
          bankName: parsed.data.bankName,
          transferDate: parsed.data.transferDate,
          amount: parsed.data.amount
        }
      });

      await tx.paymentProof.create({
        data: {
          applicationId: application.id,
          fileUrl: parsed.data.paymentProof.fileUrl,
          fileType: parsed.data.paymentProof.fileType,
          fileSizeBytes: parsed.data.paymentProof.fileSizeBytes
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { membershipStatus: MembershipStatus.PENDING }
      });

      return tx.application.findUnique({
        where: { id: application.id },
        include: { paymentProof: true }
      });
    });

    return res.status(201).json({ application: created });
  } catch (error) {
    return next(error);
  }
});

applicationsRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { paymentProof: true }
    });
    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

