"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const whoop_1 = __importDefault(require("./routes/whoop"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 8787);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.send("WHOOP backend is running.");
});
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
app.use("/whoop", whoop_1.default);
app.listen(PORT, "0.0.0.0", () => {
    console.log(`WHOOP backend listening on port ${PORT}`);
});
