// backend/src/routes/eeg.js
//
// GET  /api/eeg/stream  — SSE proxy to FastAPI ML service
// POST /api/eeg/predict — proxy to FastAPI /predict
//
// ARCHITECTURE: Raw byte passthrough proxy. Every byte from ML → browser untouched.
// No text processing, no line parsing, no pipe() — manual write+flush only.

const http    = require("http");
const https   = require("https");
const express = require("express");
const { protect } = require("../middleware/authMiddleware");

// Persistent keep-alive agents — shared across all SSE connections.
// Without these, Node.js creates a new TCP socket per request and may close it prematurely.
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

  // ─── 1. SSE Response Headers ─────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type":           "text/event-stream",
    "Cache-Control":          "no-cache, no-store, no-transform",
    "Connection":             "keep-alive",
    "X-Accel-Buffering":      "no",
    "X-Content-Type-Options": "nosniff",
  });

  // ─── 2. Socket Tuning ────────────────────────────────────────────────────
  // setNoDelay: disable Nagle algorithm so small SSE frames ship immediately
  // setKeepAlive: send TCP probes to prevent Render from killing idle sockets
  // setTimeout(0): never time out this socket
  if (res.socket) {
    res.socket.setNoDelay(true);
    res.socket.setKeepAlive(true, 5000);
    res.socket.setTimeout(0);
  }
  if (req.socket) {
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0);
  }

  // ─── 3. Proxy Heartbeat ──────────────────────────────────────────────────
  // This keeps the BROWSER ↔ PROXY connection alive even if upstream is slow.
  // Uses a named SSE event so it passes through all intermediaries.
  const heartbeat = setInterval(() => {
    if (clientDisconnected) return;
    try {
      res.write("event: heartbeat\ndata: proxy-ping\n\n");
    } catch (_) { /* client gone */ }
  }, 10000);

  let clientDisconnected = false;
  let upstreamReq = null;

  // ─── 4. Client Disconnect Handler ────────────────────────────────────────
  req.on("close", () => {
    clientDisconnected = true;
    clearInterval(heartbeat);
    if (upstreamReq) {
      try { upstreamReq.destroy(); } catch (_) {}
    }
  });

  // ─── 5. Upstream Connection ──────────────────────────────────────────────
  const target = new URL(EEG_SOURCE_URL);
  const lib = target.protocol === "https:" ? https : http;
  const agent = target.protocol === "https:" ? httpsAgent : httpAgent;

  console.log(`[SSE Proxy] Opening upstream: ${EEG_SOURCE_URL}`);

  upstreamReq = lib.request(
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
        console.error(`[SSE Proxy] Upstream HTTP ${upstream.statusCode}`);
        clearInterval(heartbeat);
        if (!clientDisconnected) {
          try {
            res.write(`event: error\ndata: ${JSON.stringify({ error: "Upstream failure", status: upstream.statusCode })}\n\n`);
            res.end();
          } catch (_) {}
        }
        return;
      }

      console.log("[SSE Proxy] Upstream connected — piping raw bytes");

      // Send handshake NOW — only after upstream is confirmed alive
      try {
        res.write("retry: 5000\n");
        res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: Date.now() })}\n\n`);
      } catch (_) {}

      // ─── 6. Raw Byte Passthrough ───────────────────────────────────────
      // Every chunk from upstream is written to the client AS-IS.
      // No string parsing, no transformation, no buffering.
      upstream.on("data", (chunk) => {
        if (clientDisconnected) return;
        try {
          res.write(chunk);
        } catch (_) {}
      });

      upstream.on("end", () => {
        console.log("[SSE Proxy] Upstream ended");
        clearInterval(heartbeat);
        if (!clientDisconnected) {
          try { res.end(); } catch (_) {}
        }
      });

      upstream.on("error", (err) => {
        console.error("[SSE Proxy] Upstream stream error:", err.message);
        clearInterval(heartbeat);
        if (!clientDisconnected) {
          try { res.end(); } catch (_) {}
        }
      });
    }
  );

  upstreamReq.on("error", (err) => {
    console.error("[SSE Proxy] Request error:", err.message);
    clearInterval(heartbeat);
    if (!clientDisconnected) {
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "ML service unreachable" })}\n\n`);
        res.end();
      } catch (_) {}
    }
  });

  // No timeout on the upstream socket — SSE must stay open indefinitely
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
