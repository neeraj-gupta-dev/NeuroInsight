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
if (!process.env.EEG_STREAM_URL && !process.env.ML_SERVICE_URL) {
  console.error("\n[FATAL] System configuration error: No EEG telemetry upstream configured.");
  console.error("Please set either EEG_STREAM_URL (Full URL) or ML_SERVICE_URL (Base Service).\n");
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

// Diagnostic: Check if ML service is reachable
app.get("/api/debug/ml", async (_req, res) => {
  const mlUrl = process.env.EEG_STREAM_URL || process.env.ML_SERVICE_URL;
  if (!mlUrl) return res.json({ status: "error", message: "No ML_SERVICE_URL configured" });
  
  const baseUrl = process.env.ML_SERVICE_URL || new URL(mlUrl).origin;
  try {
    const { default: fetch } = await import("node-fetch");
    const start = Date.now();
    const response = await fetch(`${baseUrl}/health`, { timeout: 15000 });
    const elapsed = Date.now() - start;
    const body = await response.json().catch(() => ({}));
    res.json({ 
      status: response.ok ? "ok" : "error", 
      ml_url: baseUrl,
      stream_url: process.env.EEG_STREAM_URL || `${baseUrl}/api/eeg/stream`,
      http_status: response.status, 
      latency_ms: elapsed, 
      ml_response: body 
    });
  } catch (err) {
    res.json({ 
      status: "unreachable", 
      ml_url: baseUrl,
      error: err.message,
      hint: "ML service may be sleeping (Render free tier). Try again in 30-60s."
    });
  }
});

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
  console.log(`  ML_SERVICE_URL: ${process.env.ML_SERVICE_URL}`);
  console.log(`  EEG_STREAM_URL: ${process.env.EEG_STREAM_URL}`);
});

/**
 * Render Proxy Hardening
 * Prevents premature socket closure by the reverse proxy.
 */
server.keepAliveTimeout = 65000;
server.headersTimeout   = 66000;

module.exports = app;
