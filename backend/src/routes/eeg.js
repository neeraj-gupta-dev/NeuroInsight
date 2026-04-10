// backend/src/routes/eeg.js
//
// GET  /api/eeg/stream  — SSE proxy to FastAPI ML service
// POST /api/eeg/predict — proxy to FastAPI /predict
//
// ARCHITECTURE:
// 1. Browser SSE pipe is opened immediately and kept alive with heartbeats
// 2. Backend wakes up the ML service with a health check before attempting SSE
// 3. If upstream fails, backend retries internally (up to 20 attempts over ~3 min)
// 4. Browser connection is NEVER closed due to upstream issues

const http    = require("http");
const https   = require("https");
const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const httpAgent  = new http.Agent({ keepAlive: true, keepAliveMsecs: 10000 });
const httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 10000 });

const router = express.Router();
const ML_URL = () => process.env.ML_SERVICE_URL;

// ── Helper: Wake-up ping to ML service ─────────────────────────────────────
function wakeUpML(baseUrl) {
  return new Promise((resolve) => {
    try {
      const target = new URL(baseUrl);
      const lib = target.protocol === "https:" ? https : http;
      const req = lib.get(`${baseUrl}/health`, { timeout: 15000 }, (res) => {
        let body = "";
        res.on("data", (c) => body += c);
        res.on("end", () => {
          console.log(`[SSE Proxy] ML health: ${res.statusCode} - ${body.slice(0, 100)}`);
          resolve(res.statusCode === 200);
        });
      });
      req.on("error", (e) => {
        console.log(`[SSE Proxy] ML health check failed: ${e.message}`);
        resolve(false);
      });
      req.on("timeout", () => {
        console.log("[SSE Proxy] ML health check timed out");
        req.destroy();
        resolve(false);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

// ── GET /api/eeg/stream ────────────────────────────────────────────────────
router.get("/stream", protect, (req, res) => {
  const baseML = process.env.ML_SERVICE_URL;
  const fullStream = process.env.EEG_STREAM_URL;
  const EEG_SOURCE_URL = fullStream || (baseML ? `${baseML}/api/eeg/stream` : null);
  // For health check, we need the base URL
  const ML_BASE = fullStream ? new URL(fullStream).origin : baseML;

  if (!EEG_SOURCE_URL) {
    return res.status(503).json({ message: "Telemetry upstream not configured." });
  }

  // 1. SSE Headers — immediate
  res.writeHead(200, {
    "Content-Type":           "text/event-stream",
    "Cache-Control":          "no-cache, no-store, no-transform",
    "Connection":             "keep-alive",
    "X-Accel-Buffering":      "no",
    "X-Content-Type-Options": "nosniff",
  });

  // 2. Socket tuning
  if (res.socket) {
    res.socket.setNoDelay(true);
    res.socket.setKeepAlive(true, 5000);
    res.socket.setTimeout(0);
  }
  if (req.socket) {
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0);
  }

  // 3. Immediate handshake
  res.write("retry: 10000\n");
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: Date.now() })}\n\n`);

  // 4. Heartbeat — 8s interval keeps Render proxy alive
  const heartbeat = setInterval(() => {
    if (clientDisconnected) return;
    try { res.write("event: heartbeat\ndata: proxy\n\n"); } catch (_) {}
  }, 8000);

  let clientDisconnected = false;
  let currentUpstream = null;

  req.on("close", () => {
    clientDisconnected = true;
    clearInterval(heartbeat);
    if (currentUpstream) {
      try { currentUpstream.destroy(); } catch (_) {}
    }
  });

  // 5. Upstream connection with wake-up and retry
  const target = new URL(EEG_SOURCE_URL);
  const lib = target.protocol === "https:" ? https : http;
  const agent = target.protocol === "https:" ? httpsAgent : httpAgent;

  async function connectUpstream(attempt) {
    if (clientDisconnected) return;

    const MAX_ATTEMPTS = 20;
    if (attempt > MAX_ATTEMPTS) {
      console.error(`[SSE Proxy] Gave up after ${MAX_ATTEMPTS} attempts`);
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "ML service unavailable" })}\n\n`);
        res.end();
      } catch (_) {}
      clearInterval(heartbeat);
      return;
    }

    // On first attempt and every 5th retry, send a health-check wake-up ping
    if (ML_BASE && (attempt === 1 || attempt % 5 === 0)) {
      try {
        res.write(`event: status\ndata: ${JSON.stringify({ status: "waking", attempt, message: "Waking ML service..." })}\n\n`);
      } catch (_) {}
      
      const healthy = await wakeUpML(ML_BASE);
      if (!healthy && attempt === 1) {
        // ML service is cold — wait a bit and send a status update
        console.log("[SSE Proxy] ML service not ready, waiting for cold start...");
        try {
          res.write(`event: status\ndata: ${JSON.stringify({ status: "coldstart", attempt, message: "ML service starting up..." })}\n\n`);
        } catch (_) {}
        // Wait 5s for cold start on first attempt
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (clientDisconnected) return;

    console.log(`[SSE Proxy] Upstream attempt ${attempt}: ${EEG_SOURCE_URL}`);

    if (attempt > 1) {
      try {
        res.write(`event: status\ndata: ${JSON.stringify({ status: "connecting", attempt, message: "Connecting to ML service..." })}\n\n`);
      } catch (_) {}
    }

    const upstreamReq = lib.request(
      {
        hostname: target.hostname,
        port:     target.port || (target.protocol === "https:" ? 443 : 80),
        path:     target.pathname + target.search,
        method:   "GET",
        agent,
        timeout:  20000, // 20s timeout per attempt
        headers: {
          "Accept":        "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection":    "keep-alive",
        },
      },
      (upstream) => {
        if (upstream.statusCode !== 200) {
          console.warn(`[SSE Proxy] Upstream HTTP ${upstream.statusCode} (attempt ${attempt})`);
          const delay = Math.min(3000 + attempt * 1000, 10000);
          setTimeout(() => connectUpstream(attempt + 1), delay);
          return;
        }

        console.log("[SSE Proxy] ✓ Upstream connected — streaming");
        currentUpstream = upstreamReq;

        try {
          res.write(`event: upstream\ndata: ${JSON.stringify({ status: "synced" })}\n\n`);
        } catch (_) {}

        // Raw byte passthrough
        upstream.on("data", (chunk) => {
          if (clientDisconnected) return;
          try { res.write(chunk); } catch (_) {}
        });

        upstream.on("end", () => {
          console.log("[SSE Proxy] Upstream ended — reconnecting in 3s");
          currentUpstream = null;
          if (!clientDisconnected) {
            setTimeout(() => connectUpstream(1), 3000);
          }
        });

        upstream.on("error", (err) => {
          console.error("[SSE Proxy] Upstream error:", err.message);
          currentUpstream = null;
          if (!clientDisconnected) {
            setTimeout(() => connectUpstream(1), 3000);
          }
        });
      }
    );

    upstreamReq.on("error", (err) => {
      console.error(`[SSE Proxy] Attempt ${attempt} failed: ${err.message}`);
      const delay = Math.min(3000 + attempt * 1000, 10000);
      setTimeout(() => connectUpstream(attempt + 1), delay);
    });

    upstreamReq.on("timeout", () => {
      console.warn(`[SSE Proxy] Attempt ${attempt} timed out`);
      upstreamReq.destroy();
      const delay = Math.min(3000 + attempt * 1000, 10000);
      setTimeout(() => connectUpstream(attempt + 1), delay);
    });

    upstreamReq.end();
  }

  // Start connection process
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
