import "dotenv/config";
import express from "express";
import cors from "cors";
import whoopRouter from "./routes/whoop";

const app = express();
const PORT = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("WHOOP backend is running.");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/whoop", whoopRouter);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`WHOOP backend listening on http://127.0.0.1:${PORT}`);
});