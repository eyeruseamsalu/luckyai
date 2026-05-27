import cors from "cors";
import express from "express";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api", apiRoutes);

app.use(errorHandler);

async function start(): Promise<void> {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`[api] LuckyAI backend listening on http://localhost:${env.port}`);
    console.log(`[api] Health check: http://localhost:${env.port}/api/health`);
  });
}

start().catch((err) => {
  console.error("[api] Failed to start server", err);
  process.exit(1);
});
