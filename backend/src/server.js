// backend/src/server.js
require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const connectDB = require("./config/db");

// Route handlers
const authRoutes     = require("./routes/auth");
const eegRoutes      = require("./routes/eeg");
const sessionRoutes  = require("./routes/sessions");

// ── Bootstrap ─────────────────────────────────────────────────────────────
connectDB();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Validation ─────────────────────────────────────────────────────────────
if (!process.env.ML_SERVICE_URL) {
  console.error("\n❌ FATAL ERROR: ML_SERVICE_URL is not defined in environment variables.\n");
  process.exit(1);
}

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || [
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger — log all environments (helps debug SSE on Render)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/eeg",      eegRoutes);
app.use("/api/sessions", sessionRoutes);

// Health
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "NeuroInsight Backend v2.0" })
);

// 404 catcher
app.use((_req, res) =>
  res.status(404).json({ message: "Route not found" })
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

// ── Listen ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n[NeuroInsight Backend] listening on http://localhost:${PORT}`);
  console.log(`  ML Service → ${process.env.ML_SERVICE_URL}`);
  console.log(`  MongoDB    → ${process.env.MONGO_URI?.replace(/\/\/.*@/, "//***@") || "see .env"}\n`);
});

module.exports = app;
