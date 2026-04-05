// backend/src/routes/eeg.js
//
// GET  /api/eeg/stream  — SSE proxy to FastAPI /stream-eeg (auth via ?token=)
// POST /api/eeg/predict — proxy to FastAPI /predict
//
// NOTE: node-fetch v3 is ESM-only. We use dynamic import() inside async functions.

const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const router  = express.Router();
const ML_URL  = () => process.env.ML_SERVICE_URL;

// ── GET /api/eeg/stream ───────────────────────────────────────────────────
router.get("/stream", protect, async (req, res) => {
  // 1. Set SSE headers for production proxying
  res.setHeader("Content-Type",       "text/event-stream");
  res.setHeader("Cache-Control",      "no-cache, no-transform");
  res.setHeader("Connection",         "keep-alive");
  res.setHeader("X-Accel-Buffering",  "no");
  res.flushHeaders();

  // 2. Heartbeat to keep Render/Heroku connection alive
  const heartbeat = setInterval(() => {
    res.write(":\n\n"); // SSE comment as ping
  }, 15000);

  // 3. Setup AbortController for upstream cleanup
  const controller = new AbortController();
  
  req.on("close", () => {
    clearInterval(heartbeat);
    controller.abort();
    res.end();
  });

  try {
    const { default: fetch } = await import("node-fetch");
    const upstream = await fetch(`${ML_URL()}/stream-eeg`, {
      signal: controller.signal,
      headers: { Accept: "text/event-stream" }
    });

    if (!upstream.ok) {
      throw new Error(`Upstream returned ${upstream.status}`);
    }

    // 4. Pipe stream manually from FastAPI to Client
    const reader = upstream.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // value is a Uint8Array, pass directly to res.write
      res.write(value);
    }

  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("[eeg/stream] SSE Proxy Error:", err.message);
      res.write(`data: ${JSON.stringify({ error: "ML service unavailable" })}\n\n`);
    }
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
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
