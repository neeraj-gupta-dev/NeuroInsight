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
  // 0. Primary URL derivation for production-grade routing
  const baseML = process.env.ML_SERVICE_URL;
  const fullStream = process.env.EEG_STREAM_URL;
  
  // URL Resolution Priority:
  // 1. EEG_STREAM_URL (Full URL override)
  // 2. ML_SERVICE_URL/api/eeg/stream (Synchronized path)
  const EEG_SOURCE_URL = fullStream || (baseML ? `${baseML}/api/eeg/stream` : null);

  if (!EEG_SOURCE_URL) {
    res.status(503).json({ message: "Telemetry upstream not configured." });
    return;
  }

  // 1. Establish SSE session headers
  res.setHeader("Content-Type",           "text/event-stream");
  res.setHeader("Cache-Control",          "no-cache");
  res.setHeader("Connection",             "keep-alive");
  res.setHeader("X-Accel-Buffering",      "no");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.flushHeaders();

  // 2. Configure socket behavior
  if (req.socket) req.socket.setTimeout(0);
  if (res.socket) res.socket.setTimeout(0);

  // 3. Initiate connection handshake
  res.write("retry: 5000\n");
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: Date.now() })}\n\n`);

  // 4. Session Heartbeat (15s)
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

  // 5. Cleanup on browser session termination
  req.on("close", () => {
    clientDisconnected = true;
    clearInterval(heartbeatInterval);
    if (upstreamRequest) {
      try { upstreamRequest.destroy(); } catch (_) {}
    }
  });

  // 6. Establish upstream connection to neural processing service
  console.log(`[SSE Proxy] Connecting to upstream: ${EEG_SOURCE_URL}`);
  
  const target = new URL(EEG_SOURCE_URL);
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
      // 6a. Permanent Failure Handling (4xx) - Stop reconnection storm
      if (upstream.statusCode >= 400 && upstream.statusCode < 500) {
        console.error(`[SSE Proxy] Fatal upstream error: HTTP ${upstream.statusCode} on ${EEG_SOURCE_URL}`);
        
        if (!clientDisconnected) {
          try {
            res.write(`event: fatal\ndata: ${JSON.stringify({ 
              error: "Telemetry endpoint misconfiguration", 
              status: upstream.statusCode,
              url: EEG_SOURCE_URL 
            })}\n\n`);
            res.end();
          } catch (_) {}
        }
        clearInterval(heartbeatInterval);
        return;
      }

      // 6b. Transient Failure Handling (5xx or other)
      if (upstream.statusCode !== 200) {
        console.warn(`[SSE Proxy] Transient upstream error: HTTP ${upstream.statusCode}`);
        if (!clientDisconnected) {
          try {
            res.write(`event: error\ndata: ${JSON.stringify({ error: "Upstream busy or unavailable" })}\n\n`);
            res.end();
          } catch (_) {}
        }
        clearInterval(heartbeatInterval);
        return;
      }

      console.log("[SSE Proxy] Synchronized with upstream telemetry.");

      // Proxy data chunks immediately to client
      upstream.on("data", (chunk) => {
        if (clientDisconnected) return;
        try {
          res.write(chunk);
          if (typeof res.flush === "function") res.flush();
        } catch (error) {
          console.error("[SSE Proxy] Client write failure:", error.message);
        }
      });

      upstream.on("end", () => {
        console.log("[SSE Proxy] Upstream connection closed.");
        clearInterval(heartbeatInterval);
        if (!clientDisconnected) {
          try { res.end(); } catch (_) {}
        }
      });

      upstream.on("error", (error) => {
        console.error("[SSE Proxy] Stream processing error:", error.message);
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
    console.error("[SSE Proxy] Upstream connection failure:", error.message);
    clearInterval(heartbeatInterval);
    if (!clientDisconnected) {
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Upstream service unreachable" })}\n\n`);
        res.end();
      } catch (_) {}
    }
  });

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
