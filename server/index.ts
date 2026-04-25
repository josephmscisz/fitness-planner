// Load .env only in local development; Railway injects env vars directly
if (!process.env.RAILWAY) {
  require("dotenv").config();
}

import express from "express";
import cors from "cors";
import whoopRouter from "./routes/whoop";

const app = express();
const parsedPort = Number(process.env.PORT);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8787;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("WHOOP backend is running.");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/whoop", whoopRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WHOOP backend listening on port ${PORT}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || "undefined"}`);
});

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});