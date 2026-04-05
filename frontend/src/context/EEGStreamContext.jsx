// frontend/src/context/EEGStreamContext.jsx
//
// Global EEG stream state that survives page navigation.
// The stream lifecycle is managed here, NOT in individual components.

import {
  createContext, useContext, useRef,
  useState, useCallback, useEffect,
} from "react";
import API from "../api/axios";

const EEGStreamContext = createContext(null);

const SSE_URL         = "/api/eeg/stream";
const MAX_CHART_POINTS = 60;
const RECONNECT_DELAY  = 1500; // ms to wait before reconnecting

export function EEGStreamProvider({ children }) {
  // ── Visible state (drives UI) ───────────────────────────────────────────
  const [streaming,    setStreaming]    = useState(false);
  const [status,       setStatus]      = useState("idle");
  const [connectionStatus, setConnectionStatus] = useState("closed");
  
  // Real-time data stores
  const [eegBuffer,    setEegBuffer]   = useState([]); // Sliding window (60s)
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
  const [sessionCount, setSessionCount] = useState(0);
  const [error,        setError]       = useState(null);

  // ── Internal refs (never trigger re-renders) ────────────────────────────
  const esRef          = useRef(null);
  const intentRef      = useRef(false);
  const reconnTimerRef = useRef(null);
  const saveCounterRef = useRef(0);
  
  // Session Recording Refs
  const sessionRef     = useRef([]); // Array of 5s snapshots
  const lastSnapshotT  = useRef(0);  // Last time a snapshot was taken
  const streamStartT   = useRef(0);

  // SSE parser is now handled by native event listeners

  // ── Snapshot Recorder (Every 5s) ────────────────────────────────────────
  const takeSnapshot = useCallback((currentBuffer, now) => {
    if (now - lastSnapshotT.current < 5000) return;
    
    // Calculate averages from the buffer for the last 5 seconds
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

  // ── Finalize & Save Session ──────────────────────────────────────────────
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
      const next = [newSession, ...prev].slice(0, 50); // FIFO cap 50
      localStorage.setItem("neuro_sessions", JSON.stringify(next));
      return next;
    });

    sessionRef.current = [];
  }, []);

  // ── Core stream runner ───────────────────────────────────────────────────
  const runStream = useCallback(async () => {
    if (esRef.current) return;

    lastSnapshotT.current = Date.now();
    streamStartT.current  = Date.now();
    sessionRef.current     = [];
    setError(null);
    setStreaming(true);
    setStatus("connecting");
    setConnectionStatus("connecting");
    setHasReceivedFirstPacket(false);

    const token = localStorage.getItem("ni_token");
    const streamUrl = `${SSE_URL}?token=${token}`;
    
    // 1. Create EventSource correctly
    const es = new EventSource(streamUrl, { withCredentials: true });
    esRef.current = es;

    // 2. Handle connection handshake
    es.addEventListener("connected", () => {
      console.log("[SSE] Connected event received");
      setConnectionStatus("connected");
      setStatus("live");
    });

    // 3. Handle EEG packets (CRITICAL)
    es.addEventListener("eeg", (event) => {
      try {
        const pkt = JSON.parse(event.data);
        const now = Date.now();
        console.log("[SSE] EEG packet received", pkt.epoch_id);

        setHasReceivedFirstPacket(true); // THIS HIDES LOADER

        // Update sliding window buffer (60 seconds)
        setEegBuffer(prev => {
          const next = [...prev, pkt].filter(s => now - (s.timestamp || now) < 60000);
          takeSnapshot(next, now);
          return next;
        });

        // Update status/metrics/prediction
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
        console.error("[SSE] EEG parse error", err);
      }
    });

    // 4. Handle errors
    es.addEventListener("error", (event) => {
      console.error("[SSE] Stream error", event);
      setConnectionStatus("error");
      setError("Stream connection error occurred.");
      
      // Auto-cleanup on error to trigger reconnect or stop
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      if (intentRef.current) {
        reconnTimerRef.current = setTimeout(() => runStream(), RECONNECT_DELAY);
      } else {
        finalizeSession();
        setStreaming(false);
        setConnectionStatus("closed");
        setStatus("idle");
      }
    });
  }, [takeSnapshot, finalizeSession]);

  const startStream = useCallback(() => {
    intentRef.current = true;
    runStream();
  }, [runStream]);

  const stopStream = useCallback(() => {
    intentRef.current = false;
    clearTimeout(reconnTimerRef.current);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    finalizeSession();
    setStreaming(false);
    setConnectionStatus("closed");
    setStatus("idle");
  }, [finalizeSession]);

  const clearHistory = useCallback(() => {
    if (confirm("Permanently delete all session history?")) {
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
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  return (
    <EEGStreamContext.Provider
      value={{
        streaming, status, connectionStatus, hasReceivedFirstPacket,
        eegBuffer, latestSample, metrics,
        prediction, sessionCount, error,
        sessions, startStream, stopStream, clearHistory, restoreSession,
      }}
    >
      {children}
    </EEGStreamContext.Provider>
  );
}

export function useEEGStream() {
  const ctx = useContext(EEGStreamContext);
  if (!ctx) throw new Error("useEEGStream must be used inside EEGStreamProvider");
  return ctx;
}
