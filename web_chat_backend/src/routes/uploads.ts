import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Invalid file type"));
      return;
    }
    cb(null, true);
  }
});

export const uploadsRouter = Router();

uploadsRouter.post("/payment-proof", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  const baseUrl = process.env.PUBLIC_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

  return res.status(201).json({
    paymentProof: {
      fileUrl,
      fileType: req.file.mimetype,
      fileSizeBytes: req.file.size
    }
  });
});

