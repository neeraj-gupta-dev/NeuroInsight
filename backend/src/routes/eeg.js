// backend/src/routes/eeg.js
//
// GET  /api/eeg/stream  — SSE proxy to FastAPI /stream-eeg (auth via ?token=)
// POST /api/eeg/predict — proxy to FastAPI /predict
//
// NOTE: node-fetch v3 is ESM-only. We use dynamic import() inside async functions.

const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const router  = express.Router();
const ML_URL  = () => process.env.ML_SERVICE_URL || "http://localhost:8000";

// ── GET /api/eeg/stream ───────────────────────────────────────────────────
router.get("/stream", protect, async (req, res) => {
  // SSE headers
  res.setHeader("Content-Type",       "text/event-stream");
  res.setHeader("Cache-Control",      "no-cache");
  res.setHeader("Connection",         "keep-alive");
  res.setHeader("X-Accel-Buffering",  "no");
  res.flushHeaders();

  let upstream;
  try {
    const { default: fetch } = await import("node-fetch");
    upstream = await fetch(`${ML_URL()}/stream-eeg`);
  } catch (err) {
    console.error("[eeg/stream] Cannot reach ML service:", err.message);
    res.write(`data: ${JSON.stringify({ error: "ML service unavailable" })}\n\n`);
    return res.end();
  }

  const reader  = upstream.body;
  const onData  = (chunk) => res.write(chunk);
  const onEnd   = ()      => res.end();
  const onError = (err)   => {
    console.error("[eeg/stream] Upstream error:", err.message);
    res.end();
  };

  reader.on("data",  onData);
  reader.on("end",   onEnd);
  reader.on("error", onError);

  // Clean up when client disconnects
  req.on("close", () => {
    reader.removeListener("data",  onData);
    reader.removeListener("end",   onEnd);
    reader.removeListener("error", onError);
    reader.destroy();
  });
});

// ── POST /api/eeg/predict ─────────────────────────────────────────────────
router.post("/predict", protect, async (req, res) => {
  try {
    const { default: fetch } = await import("node-fetch");
    const response = await fetch(`${ML_URL()}/predict`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(req.body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "ML error" }));
      return res.status(response.status).json({ message: err.detail });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("[eeg/predict]", err.message);
    res.status(503).json({ message: "ML service unavailable." });
  }
});

module.exports = router;
