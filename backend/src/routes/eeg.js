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
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write("event: error\ndata: ML_SERVICE_URL not configured\n\n");
    return res.end();
  }

  // ── 1. SSE response headers — exact set required for Render+Vercel chain ─
  res.setHeader("Content-Type",               "text/event-stream");
  res.setHeader("Cache-Control",              "no-cache, no-transform");
  res.setHeader("Connection",                 "keep-alive");
  res.setHeader("X-Accel-Buffering",          "no");   // disables Nginx buffering
  res.setHeader("X-Content-Type-Options",     "nosniff");
  res.setHeader("Transfer-Encoding",          "chunked");
  res.flushHeaders(); // CRITICAL: send headers NOW before any async work

  // ── 2. Disable socket-level timeouts ──────────────────────────────────────
  if (req.socket) req.socket.setTimeout(0);
  if (res.socket) res.socket.setTimeout(0);

  // ── 3. Send immediate "connected" event so Vercel/Render don't timeout ────
  res.write("event: connected\ndata: ok\n\n");
  if (typeof res.flush === "function") res.flush();

  // ── 4. Heartbeat (every 20s) — keeps the connection alive through proxies ─
  const heartbeat = setInterval(() => {
    try {
      res.write(":\n\n"); // SSE comment — invisible to client JS, keeps TCP alive
      if (typeof res.flush === "function") res.flush();
    } catch (_) {}
  }, 20000);

  // ── 5. Client disconnect tracking ─────────────────────────────────────────
  let clientGone  = false;
  let upstreamReq = null;

  req.on("close", () => {
    clientGone = true;
    clearInterval(heartbeat);
    if (upstreamReq) {
      try { upstreamReq.destroy(); } catch (_) {}
    }
  });

  // ── 6. Open upstream connection to FastAPI ML service ─────────────────────
  const target = new URL(`${mlUrl}/stream-eeg`);

  upstreamReq = lib.request(
    {
      hostname: target.hostname,
      port:     target.port || (target.protocol === "https:" ? 443 : 80),
      path:     target.pathname + target.search,
      method:   "GET",
      // Disable Node's internal response buffering for this socket
      agent:    false,
      headers: {
        "Accept":           "text/event-stream",
        "Cache-Control":    "no-cache",
        "Connection":       "keep-alive",
        "X-Forwarded-For":  req.ip || "",
      },
    },
    (upstream) => {
      // ── Non-200 response from ML service ──────────────────────────────────
      if (upstream.statusCode !== 200) {
        console.error(`[SSE PROXY] ML service returned HTTP ${upstream.statusCode}`);
        if (!clientGone) {
          try {
            res.write(`event: error\ndata: ML_STREAM_FAILED (${upstream.statusCode})\n\n`);
            if (typeof res.flush === "function") res.flush();
            res.end();
          } catch (_) {}
        }
        clearInterval(heartbeat);
        return;
      }

      // ── Pipe every chunk from ML → browser immediately ────────────────────
      upstream.on("data", (chunk) => {
        if (clientGone) return;
        try {
          res.write(chunk);
          if (typeof res.flush === "function") res.flush();
        } catch (err) {
          console.error("[SSE PROXY] res.write failed:", err.message);
        }
      });

      upstream.on("end", () => {
        clearInterval(heartbeat);
        if (!clientGone) {
          try { res.end(); } catch (_) {}
        }
      });

      upstream.on("error", (err) => {
        console.error("[SSE PROXY] Upstream stream error:", err.message);
        clearInterval(heartbeat);
        if (!clientGone) {
          try {
            res.write(`event: error\ndata: ML_STREAM_FAILED\n\n`);
            if (typeof res.flush === "function") res.flush();
            res.end();
          } catch (_) {}
        }
      });
    }
  );

  upstreamReq.on("error", (err) => {
    console.error("[SSE PROXY] Cannot connect to ML service:", err.message);
    clearInterval(heartbeat);
    if (!clientGone) {
      try {
        res.write(`event: error\ndata: ML_SERVICE_UNAVAILABLE\n\n`);
        if (typeof res.flush === "function") res.flush();
        res.end();
      } catch (_) {}
    }
  });

  // ── 7. Disable upstream socket timeout ────────────────────────────────────
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
