import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { errorHandler } from "./middleware/errorHandler";
import { adminRouter } from "./routes/admin";
import { applicationsRouter } from "./routes/applications";
import { authRouter } from "./routes/auth";
import { chatRouter } from "./routes/chat";
import { founderRouter } from "./routes/founder";
import { healthRouter } from "./routes/health";
import { uploadsRouter } from "./routes/uploads";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/founder", founderRouter);

app.use(errorHandler);

export { app };
