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
  const [status,       setStatus]      = useState("idle"); // idle|connecting|live|error
  const [eegHistory,   setEegHistory]  = useState([]);
  const [prediction,   setPrediction]  = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [error,        setError]       = useState(null);

  // ── Internal refs (never trigger re-renders) ────────────────────────────
  const abortRef       = useRef(null);   // AbortController for the fetch
  const readerRef      = useRef(null);   // ReadableStreamDefaultReader
  const bufferRef      = useRef("");     // SSE chunk accumulation buffer
  const intentRef      = useRef(false);  // true = user WANTS stream running
  const reconnTimerRef = useRef(null);   // reconnect setTimeout handle
  const saveCounterRef = useRef(0);      // counter for periodic DB saves

  // ── SSE chunk parser ────────────────────────────────────────────────────
  const parseSSEChunk = useCallback((raw) => {
    bufferRef.current += raw;
    const blocks = bufferRef.current.split("\n\n");
    bufferRef.current = blocks.pop(); // keep incomplete tail

    const parsed = [];
    for (const block of blocks) {
      // Skip SSE heartbeat comments (": " lines sent by Express)
      if (block.trim().startsWith(":")) continue;

      const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      try {
        parsed.push(JSON.parse(dataLine.replace(/^data:\s*/, "")));
      } catch {
        // ignore malformed frame
      }
    }
    return parsed;
  }, []);

  // ── Save one event to MongoDB (every 5th) ───────────────────────────────
  const saveSession = useCallback(async (evt) => {
    if (!evt?.prediction) return;
    try {
      await API.post("/api/sessions", {
        cognitiveState:   evt.prediction.cognitive_state,
        confidence:       evt.prediction.confidence,
        epochId:          evt.epoch_id,
        subject:          evt.subject,
        features:         evt.features,
        shapValues:       evt.prediction.shap_values,
        allProbabilities: evt.prediction.all_probabilities,
      });
      setSessionCount((n) => n + 1);
    } catch {
      /* silent — never block stream due to DB error */
    }
  }, []);

  // ── Core stream runner ───────────────────────────────────────────────────
  // This function is called by startStream and also by the auto-reconnect.
  // It does NOT set intentRef — callers control that.
  const runStream = useCallback(async () => {
    // Guard: if we're already connected, do nothing
    if (abortRef.current && !abortRef.current.signal.aborted) return;

    bufferRef.current = "";
    setError(null);
    setStatus("connecting");
    setStreaming(true);

    const token = localStorage.getItem("ni_token");
    if (!token) {
      console.error("[SSE] No auth token — cannot start stream");
      setStatus("error");
      setError("Not authenticated");
      setStreaming(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      console.log("[SSE] CONNECTING to", SSE_URL);

      const response = await fetch(SSE_URL, {
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept":         "text/event-stream",
          "Cache-Control":  "no-cache",
        },
        cache:     "no-store",
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      console.log("[SSE] CONNECTED — reading stream");
      setStatus("live");

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      readerRef.current = reader;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("[SSE] DISCONNECTED — stream ended (done=true)");
          break;
        }

        const raw    = decoder.decode(value, { stream: true });
        const events = parseSSEChunk(raw);

        for (const evt of events) {
          console.log("[SSE] MESSAGE RECEIVED", evt?.epoch_id);

          if (evt?.error) {
            setError(String(evt.error));
            continue;
          }

          // Update chart
          if (evt?.features) {
            setEegHistory((prev) => {
              const point = {
                t: prev.length,
                ...Object.fromEntries(
                  Object.entries(evt.features).map(([k, v]) => [
                    k, parseFloat(Number(v).toFixed(4)),
                  ])
                ),
              };
              const next = [...prev, point];
              return next.length > MAX_CHART_POINTS
                ? next.slice(-MAX_CHART_POINTS)
                : next;
            });
          }

          // Update prediction
          if (evt?.prediction) {
            setPrediction({
              ...evt.prediction,
              epochId: evt.epoch_id,
              subject: evt.subject,
            });

            saveCounterRef.current++;
            if (saveCounterRef.current % 5 === 0) saveSession(evt);

            // Persist to localStorage for across-refresh restoration
            try {
              localStorage.setItem("neuro_last_session", JSON.stringify(evt));
            } catch { /* storage full — ignore */ }
          }
        }
      }

    } catch (err) {
      if (err.name === "AbortError") {
        console.log("[SSE] DISCONNECTED — aborted by user");
        return; // intentional stop — do NOT reconnect
      }
      console.error("[SSE] ERROR:", err.message);
      setError(err.message);
    }

    // ── If we reach here without intent=false, schedule reconnect ─────────
    if (intentRef.current) {
      console.log(`[SSE] RECONNECTING in ${RECONNECT_DELAY}ms…`);
      setStatus("connecting");
      reconnTimerRef.current = setTimeout(() => {
        if (intentRef.current) runStream();
      }, RECONNECT_DELAY);
    } else {
      setStreaming(false);
      setStatus("idle");
    }
  }, [parseSSEChunk, saveSession]);

  // ── Public: start ────────────────────────────────────────────────────────
  const startStream = useCallback(() => {
    if (intentRef.current) return; // already want stream
    intentRef.current = true;
    clearTimeout(reconnTimerRef.current);
    runStream();
  }, [runStream]);

  // ── Public: stop ─────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (!intentRef.current) return;
    console.log("[SSE] Stopping stream by user request");
    intentRef.current = false;
    clearTimeout(reconnTimerRef.current);

    // Abort fetch — this throws AbortError in runStream, which will NOT reconnect
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {});
      readerRef.current = null;
    }

    setStreaming(false);
    setStatus("idle");
  }, []);

  // ── Public: clear ────────────────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    localStorage.removeItem("neuro_last_session");
    setEegHistory([]);
    setPrediction(null);
    setSessionCount(0);
    saveCounterRef.current = 0;
    setError(null);
    setStatus(streaming ? "live" : "idle");
  }, [streaming]);

  // ── Public: restore last session from localStorage ───────────────────────
  const restoreSession = useCallback((data) => {
    if (!data) return;
    const point = {
      t: 0,
      ...Object.fromEntries(
        Object.entries(data.features ?? {}).map(([k, v]) => [
          k, parseFloat(Number(v).toFixed(4)),
        ])
      ),
    };
    setEegHistory([point]);
    if (data.prediction) {
      setPrediction({
        ...data.prediction,
        epochId: data.epoch_id,
        subject: data.subject,
      });
    }
  }, []);

  // ── Cleanup on provider unmount (app close / logout) ─────────────────────
  useEffect(() => {
    return () => {
      intentRef.current = false;
      clearTimeout(reconnTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <EEGStreamContext.Provider
      value={{
        streaming, status, eegHistory, prediction, sessionCount, error,
        startStream, stopStream, clearHistory, restoreSession,
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
