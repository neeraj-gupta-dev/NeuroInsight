// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar            from "../components/Navbar";
import EEGChart          from "../components/EEGChart";
import CognitiveStateCard from "../components/CognitiveStateCard";
import ConfidenceMeter   from "../components/ConfidenceMeter";
import SHAPChart         from "../components/SHAPChart";
import { useEEGStream }  from "../hooks/useEEGStream";

const STATUS_CONFIG = {
  idle:        { color: "#6B8BAE", label: "Idle",        dot: "#6B8BAE" },
  connecting:  { color: "#FFD700", label: "Connecting…", dot: "#FFD700" },
  live:        { color: "#00FF88", label: "Live Stream",  dot: "#00FF88" },
  error:       { color: "#FF3366", label: "Error",        dot: "#FF3366" },
};

export default function Dashboard() {
  const {
    streaming, eegHistory, prediction,
    sessionCount, error, status,
    startStream, stopStream, clearHistory,
    restoreSession,
  } = useEEGStream();

  const [isRestored, setIsRestored] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("neuro_last_session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        restoreSession(data);
        setIsRestored(true);
      } catch (err) {
        console.error("Failed to restore session:", err);
      }
    }
  }, [restoreSession]);

  // Cleanup on unmount
  useEffect(() => () => stopStream(), [stopStream]);

  // Handle start simulation (clears restoration state)
  const handleStart = () => {
    setIsRestored(false);
    startStream();
  };

  // Handle clear dashboard (clears restoration state)
  const handleClear = () => {
    setIsRestored(false);
    clearHistory();
  };

  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div className="min-h-screen" style={{ paddingTop: 64 }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="font-display font-bold text-2xl" style={{ color: "#E8F4FF" }}>
              EEG Cognitive Monitor
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6B8BAE" }}>
              PhysioNet EEGBCI · RandomForest + SHAP · Real-time simulation
            </p>
          </div>

          {/* Status + controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                background: `${sc.dot}18`,
                border: `1px solid ${sc.dot}44`,
                color: sc.color,
              }}
            >
              <div className="pulse-dot" style={{ background: sc.dot }} />
              {sc.label}
            </div>

            {/* Session counter */}
            <div
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.2)",
                color: "#00D4FF",
              }}
            >
              {sessionCount} sessions saved
            </div>

            {/* Action buttons */}
            {!streaming ? (
              <button id="btn-start" onClick={handleStart} className="btn-primary">
                ▶ Start Simulation
              </button>
            ) : (
              <button id="btn-stop" onClick={stopStream} className="btn-danger">
                ■ Stop
              </button>
            )}

            <button id="btn-clear" onClick={handleClear} className="btn-ghost">
              Clear
            </button>
          </div>
        </motion.div>

        {/* ── Persistence notification (Only if data was restored) ──────────────── */}
        <AnimatePresence>
          {isRestored && !streaming && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 flex justify-center"
            >
              <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm border border-yellow-200">
                <span>⚠️</span>
                <span>Showing last recorded session</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
              style={{ background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)", color: "#FF3366" }}
            >
              <span>⚠️</span>
              <span><strong>Stream error:</strong> {error}</span>
              <span style={{ color: "#6B8BAE" }}>— Is the ML service running on port 8000?</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left column — EEG chart (spans 2 cols) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <EEGChart data={eegHistory} streaming={streaming} />
            <SHAPChart prediction={prediction} />
          </div>

          {/* Right column — state + confidence */}
          <div className="flex flex-col gap-6">
            <CognitiveStateCard prediction={prediction} />
            <ConfidenceMeter    prediction={prediction} />

            {/* Info card */}
            <motion.div
              className="glass-card p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#6B8BAE" }}>
                System Info
              </p>
              <div className="space-y-2 text-xs">
                {[
                  ["Dataset",  "PhysioNet EEGBCI"],
                  ["Subjects", "1 – 5"],
                  ["Bands",    "δ θ α β γ"],
                  ["Model",    "RandomForest (n=200)"],
                  ["XAI",      "SHAP TreeExplainer"],
                  ["Stream",   "SSE · 600 ms/epoch"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span style={{ color: "#6B8BAE" }}>{k}</span>
                    <span style={{ color: "#E8F4FF" }}>{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
