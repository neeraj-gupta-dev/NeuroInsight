// frontend/src/context/EEGStreamContext.jsx
import {
  createContext, useContext, useRef,
  useState, useCallback, useEffect,
} from "react";

const EEGStreamContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SSE_PATH         = "/api/eeg/stream";
const WATCHDOG_TIMEOUT = 30000; // 30s timeout for silent failures

/**
 * EEG Stream States
 */
export const StreamStatus = {
  IDLE:         "IDLE",
  CONNECTING:   "CONNECTING",
  CONNECTED:    "CONNECTED",
  DEGRADED:     "DEGRADED",
  RECONNECTING: "RECONNECTING",
  DISCONNECTED: "DISCONNECTED",
  ERROR:        "ERROR",
};

export function EEGStreamProvider({ children }) {
  const [streaming,    setStreaming]    = useState(false);
  const [status,       setStatus]      = useState(StreamStatus.IDLE);
  const [eegBuffer,    setEegBuffer]   = useState([]); 
  const [latestSample, setLatestSample] = useState(null);
  const [metrics,      setMetrics]     = useState({
    attention: 0, relaxation: 0, stress: 0, engagement: 0
  });
  const [hasReceivedFirstPacket, setHasReceivedFirstPacket] = useState(false);

  const [prediction,   setPrediction]  = useState(null);
  const [sessions,     setSessions]    = useState(() => {
    try {
      const saved = localStorage.getItem("neuro_sessions");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [error,        setError]       = useState(null);

  // ── Internal Refs ────────────────────────────────────────────────────────
  const esRef             = useRef(null);
  const intentRef         = useRef(false);
  const reconnTimerRef    = useRef(null);
  const reconnectAttempts = useRef(0);
  const watchdogTimerRef  = useRef(null);
  
  const sessionRef     = useRef([]);
  const lastSnapshotT  = useRef(0);
  const streamStartT   = useRef(0);

  // ── Watchdog Management ──────────────────────────────────────────────────
  const resetWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    watchdogTimerRef.current = setTimeout(() => {
      console.warn("[Telemetry] Watchdog timeout: No signal detected for 30s.");
      setStatus(StreamStatus.DEGRADED);
      handleReconnect();
    }, WATCHDOG_TIMEOUT);
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  // ── Session Recording ────────────────────────────────────────────────────
  const takeSnapshot = useCallback((currentBuffer, now) => {
    if (now - lastSnapshotT.current < 5000) return;
    const recent = currentBuffer.filter(s => now - s.timestamp < 5000);
    if (recent.length === 0) return;

    const avg = (key) => recent.reduce((sum, s) => sum + (s[key] || 0), 0) / recent.length;

    const snapshot = {
      timestamp: now,
      duration:  Math.round((now - streamStartT.current) / 1000),
      attention:  Math.round(avg("attention")),
      relaxation: Math.round(avg("relaxation")),
      stress:     Math.round(avg("stress")),
      engagement: Math.round(avg("engagement")),
    };

    sessionRef.current.push(snapshot);
    lastSnapshotT.current = now;
  }, []);

  const finalizeSession = useCallback(() => {
    if (sessionRef.current.length < 2) {
      sessionRef.current = [];
      return;
    }

    const snaps = sessionRef.current;
    const avg = (key) => snaps.reduce((sum, s) => sum + s[key], 0) / snaps.length;
    const max = (key) => Math.max(...snaps.map(s => s[key]));

    const newSession = {
      id: `session_${Date.now()}`,
      startTime: streamStartT.current,
      endTime: Date.now(),
      duration: Math.round((Date.now() - streamStartT.current) / 1000),
      snapshots: snaps,
      averages: {
        attention:  Math.round(avg("attention")),
        relaxation: Math.round(avg("relaxation")),
        stress:     Math.round(avg("stress")),
        engagement: Math.round(avg("engagement")),
      },
      peaks: {
        maxAttention:  Math.round(max("attention")),
        maxStress:     Math.round(max("stress")),
        maxEngagement: Math.round(max("engagement")),
      }
    };

    setSessions(prev => {
      const next = [newSession, ...prev].slice(0, 50); 
      localStorage.setItem("neuro_sessions", JSON.stringify(next));
      return next;
    });

    sessionRef.current = [];
  }, []);

  // ── Core Stream Management ────────────────────────────────────────────────
  const handleReconnect = useCallback(() => {
    if (!intentRef.current) return;
    
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    clearWatchdog();

    reconnectAttempts.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    
    console.log(`[Telemetry] Attempting secure reconnection in ${delay}ms... (Attempt ${reconnectAttempts.current})`);
    setStatus(StreamStatus.RECONNECTING);
    setError("Connection to EEG telemetry server lost. Attempting secure reconnection...");

    reconnTimerRef.current = setTimeout(() => {
      runStream();
    }, delay);
  }, []);

  const runStream = useCallback(async () => {
    if (esRef.current) return;

    lastSnapshotT.current = Date.now();
    streamStartT.current  = Date.now();
    sessionRef.current     = [];
    setError(null);
    setStreaming(true);
    setStatus(reconnectAttempts.current > 0 ? StreamStatus.RECONNECTING : StreamStatus.CONNECTING);
    setHasReceivedFirstPacket(false);

    const token = localStorage.getItem("ni_token");
    if (!token) {
        setError("Authentication session expired. Please sign in again.");
        setStatus(StreamStatus.ERROR);
        setStreaming(false);
        return;
    }

    const streamUrl = `${API_BASE_URL}${SSE_PATH}?token=${token}`;
    let receivedConnected = false;
    
    try {
      const es = new EventSource(streamUrl, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        // HTTP channel opened — but upstream may not be ready yet.
        // Do NOT reset reconnect counter here; wait for 'connected' event.
        console.log("[Telemetry] HTTP channel opened. Waiting for upstream sync...");
        resetWatchdog();
      };

      es.addEventListener("connected", () => {
        // Backend proxy SSE pipe is alive. Upstream may still be connecting.
        receivedConnected = true;
        console.log("[Telemetry] Proxy channel active. Waiting for ML upstream...");
        setStatus(StreamStatus.CONNECTED);
        resetWatchdog();
      });

      es.addEventListener("status", (event) => {
        // Backend is retrying upstream connection — stream is alive, just waiting
        try {
          const info = JSON.parse(event.data);
          console.log(`[Telemetry] ${info.message || "Connecting..."} (attempt ${info.attempt})`);
        } catch (_) {}
        resetWatchdog();
      });

      es.addEventListener("upstream", () => {
        // Upstream ML service is now connected and streaming
        console.log("[Telemetry] ML upstream synchronized. Data flow active.");
        resetWatchdog();
      });

      es.addEventListener("heartbeat", () => {
        receivedConnected = true;
        resetWatchdog();
      });

      es.addEventListener("eeg", (event) => {
        try {
          const pkt = JSON.parse(event.data);
          const now = Date.now();
          resetWatchdog();

          // Mark that we've received real data
          if (!receivedConnected) {
            receivedConnected = true;
            reconnectAttempts.current = 0;
          }

          setHasReceivedFirstPacket(true);

          setEegBuffer(prev => {
            const next = [...prev, pkt].filter(s => now - (s.timestamp || now) < 60000);
            takeSnapshot(next, now);
            return next;
          });

          setLatestSample(pkt);
          setMetrics({
            attention: pkt.attention,
            relaxation: pkt.relaxation,
            stress: pkt.stress,
            engagement: pkt.engagement
          });
          setPrediction(pkt.prediction);
          localStorage.setItem("neuro_last_session", event.data);
        } catch (err) {
          console.error("[Telemetry] Signal processing error:", err);
        }
      });

      es.addEventListener("fatal", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.error("[Telemetry] FATAL ERROR: Permanent upstream failure.", data);
          setError(`Configuration Error: ${data.error || "Upstream service mismatch"}`);
        } catch (err) {
          console.error("[Telemetry] FATAL ERROR received.", event.data);
          setError("Upstream service configuration mismatch.");
        }
        
        // Terminal failure: inhibit reconnection
        intentRef.current = false;
        setStatus(StreamStatus.ERROR);
        setStreaming(false);
        clearWatchdog();
        
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
      });

      es.onerror = () => {
        // Only attempt reconnect if it wasn't a fatal terminal event
        if (intentRef.current) {
          if (receivedConnected) {
            console.warn("[Telemetry] Stream interrupted after successful connection. Reconnecting...");
          } else {
            console.warn("[Telemetry] Connection failed before upstream sync. Reconnecting...");
          }
          handleReconnect();
        }
      };
    } catch (err) {
      console.error("[Telemetry] Initialization failed:", err);
      handleReconnect();
    }
  }, [handleReconnect, resetWatchdog, clearWatchdog, takeSnapshot]);

  const startStream = useCallback(() => {
    intentRef.current = true;
    reconnectAttempts.current = 0;
    runStream();
  }, [runStream]);

  const stopStream = useCallback(() => {
    intentRef.current = false;
    clearTimeout(reconnTimerRef.current);
    clearWatchdog();
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    finalizeSession();
    setStreaming(false);
    setStatus(StreamStatus.DISCONNECTED);
  }, [finalizeSession, clearWatchdog]);

  const clearHistory = useCallback(() => {
    if (confirm("Permanently delete all clinical session history?")) {
      localStorage.removeItem("neuro_sessions");
      setSessions([]);
    }
  }, []);

  const restoreSession = useCallback((data) => {
    if (!data) return;
    setLatestSample(data);
    setPrediction(data.prediction);
    setMetrics({
      attention: data.attention,
      relaxation: data.relaxation,
      stress: data.stress,
      engagement: data.engagement
    });
  }, []);

  useEffect(() => () => {
    intentRef.current = false;
    clearWatchdog();
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, [clearWatchdog]);

  return (
    <EEGStreamContext.Provider
      value={{
        streaming, status, hasReceivedFirstPacket,
        eegBuffer, latestSample, metrics,
        prediction, error,
        sessions, startStream, stopStream, clearHistory, restoreSession,
      }}
    >
      {children}
    </EEGStreamContext.Provider>
  );
}

export function useEEGStream() {
  const ctx = useContext(EEGStreamContext);
  if (!ctx) throw new Error("useEEGStream requires EEGStreamProvider enclosure.");
  return ctx;
}
