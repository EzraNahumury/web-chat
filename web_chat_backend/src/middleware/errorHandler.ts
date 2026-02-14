import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File exceeds 5MB limit" });
    }
    return res.status(400).json({ message: error.message });
  }

  if (error instanceof Error) {
    if (error.message === "Invalid file type") {
      return res.status(400).json({ message: "Only JPG, PNG, PDF are allowed" });
    }
    return res.status(500).json({ message: error.message });
  }

  return res.status(500).json({ message: "Internal server error" });
}
