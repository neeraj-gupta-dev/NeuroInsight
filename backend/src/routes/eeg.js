// backend/src/routes/eeg.js
//
// GET  /api/eeg/stream  — SSE proxy to FastAPI /stream-eeg (auth via ?token=)
// POST /api/eeg/predict — proxy to FastAPI /predict
//
// Uses native Node.js https/http module for streaming to avoid ESM issues
// with node-fetch v3 in production (Render runs CJS).

const http    = require("http");
const https   = require("https");
const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const ML_URL = () => process.env.ML_SERVICE_URL;

// ── GET /api/eeg/stream ────────────────────────────────────────────────────
// Acts as a transparent SSE proxy between the browser and FastAPI.
// Uses native Node http/https to avoid node-fetch ESM incompatibilities.
router.get("/stream", protect, async (req, res) => {
  const mlUrl = ML_URL();
  if (!mlUrl) {
    res.write(`event: error\ndata: ML_SERVICE_URL not configured\n\n`);
    return res.end();
  }

  // 1. Correct SSE headers — exact set needed for Render/Vercel proxy chain
  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache, no-transform");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.flushHeaders();

  // 2. Disable socket timeouts so Render doesn't kill the idle connection
  if (req.socket) req.socket.setTimeout(0);
  if (res.socket) res.socket.setTimeout(0);

  // 3. Heartbeat — Render kills connections with > 30s inactivity
  const heartbeat = setInterval(() => {
    try { res.write(":\n\n"); } catch (_) {}
  }, 20000);

  // 4. Parse target URL
  const target = new URL(`${mlUrl}/stream-eeg`);
  const lib    = target.protocol === "https:" ? https : http;

  // 5. Track whether the client has disconnected
  let clientGone = false;
  req.on("close", () => {
    clientGone = true;
    clearInterval(heartbeat);
    try { res.end(); } catch (_) {}
    if (upstreamReq) {
      try { upstreamReq.destroy(); } catch (_) {}
    }
  });

  // 6. Open upstream request using native http/https
  let upstreamReq = null;

  upstreamReq = lib.request(
    {
      hostname: target.hostname,
      port:     target.port || (target.protocol === "https:" ? 443 : 80),
      path:     target.pathname + target.search,
      method:   "GET",
      headers: {
        "Accept":        "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    },
    (upstream) => {
      // Non-200 from ML service
      if (upstream.statusCode !== 200) {
        console.error(`[eeg/stream] ML service returned ${upstream.statusCode}`);
        if (!clientGone) {
          res.write(`event: error\ndata: ML_STREAM_FAILED (${upstream.statusCode})\n\n`);
          res.end();
        }
        clearInterval(heartbeat);
        return;
      }

      // 7. Pipe bytes directly — no buffering, no transformation
      upstream.on("data", (chunk) => {
        if (!clientGone) {
          try {
            res.write(chunk);
            // If compression middleware added res.flush, call it
            if (typeof res.flush === "function") res.flush();
          } catch (_) {}
        }
      });

      upstream.on("end", () => {
        clearInterval(heartbeat);
        if (!clientGone) {
          try { res.end(); } catch (_) {}
        }
      });

      upstream.on("error", (err) => {
        console.error("[eeg/stream] Upstream error:", err.message);
        clearInterval(heartbeat);
        if (!clientGone) {
          try {
            res.write(`event: error\ndata: ML_STREAM_FAILED\n\n`);
            res.end();
          } catch (_) {}
        }
      });
    }
  );

  upstreamReq.on("error", (err) => {
    console.error("[eeg/stream] Cannot connect to ML service:", err.message);
    clearInterval(heartbeat);
    if (!clientGone) {
      try {
        res.write(`event: error\ndata: ML_SERVICE_UNAVAILABLE\n\n`);
        res.end();
      } catch (_) {}
    }
  });

  // Set timeout on upstream request to 0 to prevent Render killing it
  upstreamReq.setTimeout(0);
  upstreamReq.end();
});

// ── POST /api/eeg/predict ──────────────────────────────────────────────────
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
