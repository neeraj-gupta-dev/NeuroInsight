// backend/src/server.js
require("dotenv").config();

const express     = require("express");
const cors        = require("cors");
const compression = require("compression");
const connectDB   = require("./config/db");

// Route handlers
const authRoutes    = require("./routes/auth");
const eegRoutes     = require("./routes/eeg");
const sessionRoutes = require("./routes/sessions");

// ── Bootstrap ──────────────────────────────────────────────────────────────
connectDB();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Validation ─────────────────────────────────────────────────────────────
if (!process.env.ML_SERVICE_URL) {
  console.error("\n❌ FATAL: ML_SERVICE_URL is not set.\n");
  process.exit(1);
}

// ── Compression (SSE routes EXCLUDED) ─────────────────────────────────────
// Compression MUST be excluded for SSE — gzip buffers chunks and breaks streaming.
app.use(
  compression({
    filter: (req, res) => {
      // Never compress SSE — it prevents chunk-by-chunk delivery
      if (req.headers["accept"] === "text/event-stream") return false;
      if (req.path.includes("/stream"))                  return false;
      return compression.filter(req, res);
    },
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || [
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/eeg",      eegRoutes);
app.use("/api/sessions", sessionRoutes);

// Health check
app.get("/health",     (_req, res) => res.json({ status: "ok" }));
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "NeuroInsight Backend v2.2" })
);

// 404
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

// ── Listen ─────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n[NeuroInsight] Server initialized on port ${PORT}`);
  console.log(`  ML Service Pipeline → ${process.env.ML_SERVICE_URL}`);
});

/**
 * Render Proxy Hardening
 * Prevents premature socket closure by the reverse proxy.
 */
server.keepAliveTimeout = 65000;
server.headersTimeout   = 66000;

module.exports = app;
