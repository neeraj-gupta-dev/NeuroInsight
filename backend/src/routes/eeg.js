// backend/src/routes/eeg.js
//
// GET  /api/eeg/stream  — SSE proxy to FastAPI /stream-eeg
// POST /api/eeg/predict — proxy to FastAPI /predict
//
// Uses native Node.js http/https — avoids all node-fetch ESM/CJS issues.
// This is a TRUE streaming passthrough: every chunk from ML → browser immediately.

const http    = require("http");
const https   = require("https");
const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const ML_URL = () => process.env.ML_SERVICE_URL;

// ── GET /api/eeg/stream ────────────────────────────────────────────────────
router.get("/stream", protect, (req, res) => {
  const mlUrl = ML_URL();
  if (!mlUrl) {
    res.status(503).json({ message: "Telemetry service endpoint not configured." });
    return;
  }

  // 1. Establish SSE session headers
  res.setHeader("Content-Type",           "text/event-stream");
  res.setHeader("Cache-Control",          "no-cache");
  res.setHeader("Connection",             "keep-alive");
  res.setHeader("X-Accel-Buffering",      "no"); // Disables Nginx buffering for low-latency streaming
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.flushHeaders();

  // 2. Configure socket behavior
  if (req.socket) req.socket.setTimeout(0);
  if (res.socket) res.socket.setTimeout(0);

  // 3. Initiate connection handshake and retry intervals
  res.write("retry: 5000\n");
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: Date.now() })}\n\n`);

  // 4. Session Heartbeat (15s) - Maintains channel integrity through proxy layers
  const heartbeatInterval = setInterval(() => {
    try {
      res.write("event: heartbeat\ndata: ping\n\n");
      if (typeof res.flush === "function") res.flush();
    } catch (error) {
      console.error("[SSE] Heartbeat failure:", error.message);
    }
  }, 15000);

  let clientDisconnected = false;
  let upstreamRequest    = null;

  // 5. Cleanup on client disconnect
  req.on("close", () => {
    clientDisconnected = true;
    clearInterval(heartbeatInterval);
    if (upstreamRequest) {
      try { upstreamRequest.destroy(); } catch (_) {}
    }
  });

  // 6. Establish upstream connection to neural processing cluster
  const target = new URL(`${mlUrl}/stream-eeg`);
  const protocol = target.protocol === "https:" ? https : http;

  upstreamRequest = protocol.request(
    {
      hostname: target.hostname,
      port:     target.port || (target.protocol === "https:" ? 443 : 80),
      path:     target.pathname + target.search,
      method:   "GET",
      agent:    false,
      headers: {
        "Accept":           "text/event-stream",
        "Cache-Control":    "no-cache",
        "Connection":       "keep-alive",
        "X-Forwarded-For":  req.ip || "",
      },
    },
    (upstream) => {
      if (upstream.statusCode !== 200) {
        console.error(`[SSE Upstream] HTTP Error ${upstream.statusCode}`);
        if (!clientDisconnected) {
          try {
            res.write(`event: error\ndata: ${JSON.stringify({ error: "Upstream connection failed", code: upstream.statusCode })}\n\n`);
            res.end();
          } catch (_) {}
        }
        clearInterval(heartbeatInterval);
        return;
      }

      // Stream neural data chunks to client
      upstream.on("data", (chunk) => {
        if (clientDisconnected) return;
        try {
          res.write(chunk);
          if (typeof res.flush === "function") res.flush();
        } catch (error) {
          console.error("[SSE Stream] Write failure:", error.message);
        }
      });

      upstream.on("end", () => {
        clearInterval(heartbeatInterval);
        if (!clientDisconnected) {
          try { res.end(); } catch (_) {}
        }
      });

      upstream.on("error", (error) => {
        console.error("[SSE Upstream] Data error:", error.message);
        clearInterval(heartbeatInterval);
        if (!clientDisconnected) {
          try {
            res.write(`event: error\ndata: ${JSON.stringify({ error: "Signal processing interrupted" })}\n\n`);
            res.end();
          } catch (_) {}
        }
      });
    }
  );

  upstreamRequest.on("error", (error) => {
    console.error("[SSE Connection] Failed to contact processing service:", error.message);
    clearInterval(heartbeatInterval);
    if (!clientDisconnected) {
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Processing service unavailable" })}\n\n`);
        res.end();
      } catch (_) {}
    }
  });

  // 7. Enforce no-timeout for upstream socket
  upstreamRequest.setTimeout(0);
  upstreamRequest.end();
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
