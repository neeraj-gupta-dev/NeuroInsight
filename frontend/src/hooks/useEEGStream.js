// frontend/src/hooks/useEEGStream.js
import { useState, useRef, useCallback } from "react";
import API from "../api/axios";

// Use relative URL so the Vite dev proxy handles SSE (avoids CORS on stream endpoint)
// In production this path must point to your Express host
const SSE_URL = "/api/eeg/stream";
const MAX_CHART_POINTS = 60;

export function useEEGStream() {
  const [streaming,     setStreaming]     = useState(false);
  const [eegHistory,    setEegHistory]    = useState([]);   // for chart
  const [prediction,    setPrediction]    = useState(null); // latest prediction
  const [sessionCount,  setSessionCount]  = useState(0);
  const [error,         setError]         = useState(null);
  const [status,        setStatus]        = useState("idle"); // idle | connecting | live | error

  const readerRef   = useRef(null);
  const abortRef    = useRef(null);
  const bufferRef   = useRef("");

  // ── Parse SSE text buffer ─────────────────────────────────────────────────
  const parseSSEChunk = useCallback((raw) => {
    bufferRef.current += raw;
    const events = bufferRef.current.split("\n\n");
    bufferRef.current = events.pop(); // keep incomplete last chunk

    const parsed = [];
    for (const block of events) {
      const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      try {
        parsed.push(JSON.parse(dataLine.replace(/^data:\s*/, "")));
      } catch {
        /* ignore malformed event */
      }
    }
    return parsed;
  }, []);

  // ── Save session to backend ───────────────────────────────────────────────
  const saveSession = useCallback(async (eventData) => {
    if (!eventData?.prediction) return;
    try {
      await API.post("/api/sessions", {
        cognitiveState:   eventData.prediction.cognitive_state,
        confidence:       eventData.prediction.confidence,
        epochId:          eventData.epoch_id,
        subject:          eventData.subject,
        features:         eventData.features,
        shapValues:       eventData.prediction.shap_values,
        allProbabilities: eventData.prediction.all_probabilities,
      });
      setSessionCount((n) => n + 1);
    } catch {
      /* silent — don't block streaming */
    }
  }, []);

  // ── Start streaming ───────────────────────────────────────────────────────
  const startStream = useCallback(async () => {
    if (streaming) return;
    // Set streaming=true immediately to prevent double-click race
    setStreaming(true);
    setError(null);
    setStatus("connecting");
    bufferRef.current = "";

    const token = localStorage.getItem("ni_token");
    abortRef.current = new AbortController();

    try {
      const response = await fetch(
        `${SSE_URL}?token=${token}`,
        {
          signal:  abortRef.current.signal,
          headers: { Accept: "text/event-stream" },
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setStatus("live");
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      readerRef.current = reader;

      let saveCounter = 0;

      // Wrap the reader loop in try/catch to handle unmount/abort safely
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw    = decoder.decode(value, { stream: true });
          const events = parseSSEChunk(raw);

          for (const evt of events) {
            if (evt.error) {
              setError(evt.error);
              continue;
            }

            // Update chart history
            setEegHistory((prev) => {
              const point = {
                t:     prev.length,
                ...Object.fromEntries(
                  Object.entries(evt.features ?? {}).map(([k, v]) => [
                    k,
                    parseFloat(v.toFixed(4)),
                  ])
                ),
              };
              const next = [...prev, point];
              return next.length > MAX_CHART_POINTS
                ? next.slice(next.length - MAX_CHART_POINTS)
                : next;
            });

            // Update prediction panel
            if (evt.prediction) {
              setPrediction({
                ...evt.prediction,
                epochId: evt.epoch_id,
                subject: evt.subject,
              });

              // Save every 5th event to MongoDB
              saveCounter++;
              if (saveCounter % 5 === 0) saveSession(evt);

              // Client-side persistence: save latest state to localStorage
              localStorage.setItem("neuro_last_session", JSON.stringify(evt));
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Reader loop error:", err);
          throw err; // Re-throw to be caught by outer block
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Stream error");
        setStatus("error");
      }
    } finally {
      setStreaming(false);
      setStatus((s) => (s === "live" ? "idle" : s));
    }
  }, [streaming, parseSSEChunk, saveSession]);

  // ── Stop streaming ────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    try {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
      }
    } catch (err) {
      // ignore
    }
    setStreaming(false);
    setStatus("idle");
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem("neuro_last_session");
    setEegHistory([]);
    setPrediction(null);
    setSessionCount(0);
    setError(null);
    setStatus("idle");
  }, []);

  const restoreSession = useCallback((data) => {
    if (!data) return;
    
    // Restore chart history (just the single point for now to visualize the state)
    const point = {
      t: 0,
      ...Object.fromEntries(
        Object.entries(data.features ?? {}).map(([k, v]) => [
          k,
          parseFloat(v.toFixed(4)),
        ])
      ),
    };
    setEegHistory([point]);

    // Restore prediction
    if (data.prediction) {
      setPrediction({
        ...data.prediction,
        epochId: data.epoch_id,
        subject: data.subject,
      });
    }
  }, []);

  return {
    streaming,
    eegHistory,
    prediction,
    sessionCount,
    error,
    status,
    startStream,
    stopStream,
    clearHistory,
    restoreSession,
  };
}
