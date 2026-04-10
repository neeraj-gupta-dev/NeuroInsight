// backend/src/routes/eeg.js
//
// GET  /api/eeg/stream  — SSE proxy to FastAPI ML service
// POST /api/eeg/predict — proxy to FastAPI /predict
//
// ARCHITECTURE:
// The browser SSE connection is NEVER closed due to upstream failures.
// If the upstream ML service is unavailable (cold start, crash, etc.),
// the proxy retries internally while keeping the browser alive with heartbeats.

const http    = require("http");
const https   = require("https");
const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const httpAgent  = new http.Agent({ keepAlive: true, keepAliveMsecs: 10000 });
const httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 10000 });

const router = express.Router();
const ML_URL = () => process.env.ML_SERVICE_URL;

// ── GET /api/eeg/stream ────────────────────────────────────────────────────
router.get("/stream", protect, (req, res) => {
  const baseML = process.env.ML_SERVICE_URL;
  const fullStream = process.env.EEG_STREAM_URL;
  const EEG_SOURCE_URL = fullStream || (baseML ? `${baseML}/api/eeg/stream` : null);

  if (!EEG_SOURCE_URL) {
    return res.status(503).json({ message: "Telemetry upstream not configured." });
  }

  // ─── 1. SSE Headers — send immediately so browser knows this is SSE ──────
  res.writeHead(200, {
    "Content-Type":           "text/event-stream",
    "Cache-Control":          "no-cache, no-store, no-transform",
    "Connection":             "keep-alive",
    "X-Accel-Buffering":      "no",
    "X-Content-Type-Options": "nosniff",
  });

  // ─── 2. Socket tuning ────────────────────────────────────────────────────
  if (res.socket) {
    res.socket.setNoDelay(true);
    res.socket.setKeepAlive(true, 5000);
    res.socket.setTimeout(0);
  }
  if (req.socket) {
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0);
  }

  // ─── 3. Immediate handshake — tells frontend the SSE pipe is alive ───────
  res.write("retry: 10000\n");
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: Date.now() })}\n\n`);

  // ─── 4. Heartbeat — keeps browser connection alive during upstream retries
  const heartbeat = setInterval(() => {
    if (clientDisconnected) return;
    try {
      res.write("event: heartbeat\ndata: proxy-ping\n\n");
    } catch (_) { /* client gone */ }
  }, 8000);

  let clientDisconnected = false;
  let currentUpstream = null;
  let upstreamConnected = false;

  req.on("close", () => {
    clientDisconnected = true;
    clearInterval(heartbeat);
    if (currentUpstream) {
      try { currentUpstream.destroy(); } catch (_) {}
    }
  });

  // ─── 5. Upstream connection with internal retry ──────────────────────────
  const target = new URL(EEG_SOURCE_URL);
  const lib = target.protocol === "https:" ? https : http;
  const agent = target.protocol === "https:" ? httpsAgent : httpAgent;

  function connectUpstream(attempt) {
    if (clientDisconnected) return;
    if (attempt > 10) {
      // Give up after 10 attempts — send error but DON'T close the connection.
      // The frontend's EventSource will eventually hit onerror from watchdog timeout.
      console.error("[SSE Proxy] Upstream unreachable after 10 attempts. Giving up.");
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "ML service unavailable after retries" })}\n\n`);
        res.end();
      } catch (_) {}
      clearInterval(heartbeat);
      return;
    }

    console.log(`[SSE Proxy] Upstream attempt ${attempt}: ${EEG_SOURCE_URL}`);

    // Notify the browser that we're working on it (only on retries, not first attempt)
    if (attempt > 1) {
      try {
        res.write(`event: status\ndata: ${JSON.stringify({ status: "connecting", attempt, message: "Waiting for ML service..." })}\n\n`);
      } catch (_) {}
    }

    const upstreamReq = lib.request(
      {
        hostname: target.hostname,
        port:     target.port || (target.protocol === "https:" ? 443 : 80),
        path:     target.pathname + target.search,
        method:   "GET",
        agent,
        headers: {
          "Accept":        "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection":    "keep-alive",
        },
      },
      (upstream) => {
        if (upstream.statusCode !== 200) {
          console.warn(`[SSE Proxy] Upstream HTTP ${upstream.statusCode} on attempt ${attempt}`);
          // Retry after delay — DO NOT close the browser connection
          const delay = Math.min(2000 * attempt, 15000);
          setTimeout(() => connectUpstream(attempt + 1), delay);
          return;
        }

        console.log("[SSE Proxy] Upstream connected — piping raw bytes");
        upstreamConnected = true;
        currentUpstream = upstreamReq;

        // Tell frontend upstream is now live
        try {
          res.write(`event: upstream\ndata: ${JSON.stringify({ status: "synced" })}\n\n`);
        } catch (_) {}

        // Raw byte passthrough
        upstream.on("data", (chunk) => {
          if (clientDisconnected) return;
          try { res.write(chunk); } catch (_) {}
        });

        upstream.on("end", () => {
          console.log("[SSE Proxy] Upstream ended");
          upstreamConnected = false;
          currentUpstream = null;
          // Upstream closed — retry connection instead of killing browser SSE
          if (!clientDisconnected) {
            console.log("[SSE Proxy] Upstream closed, retrying in 3s...");
            setTimeout(() => connectUpstream(1), 3000);
          }
        });

        upstream.on("error", (err) => {
          console.error("[SSE Proxy] Upstream stream error:", err.message);
          upstreamConnected = false;
          currentUpstream = null;
          if (!clientDisconnected) {
            setTimeout(() => connectUpstream(1), 3000);
          }
        });
      }
    );

    upstreamReq.on("error", (err) => {
      console.error(`[SSE Proxy] Connection error on attempt ${attempt}:`, err.message);
      // Retry after delay — DO NOT close the browser connection
      const delay = Math.min(2000 * attempt, 15000);
      setTimeout(() => connectUpstream(attempt + 1), delay);
    });

    upstreamReq.setTimeout(0);
    upstreamReq.end();
  }

  // Start the first upstream connection attempt
  connectUpstream(1);
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
