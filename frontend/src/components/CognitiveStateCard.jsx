// frontend/src/components/CognitiveStateCard.jsx
import { motion, AnimatePresence } from "framer-motion";

const STATE_CONFIG = {
  Focused:    { color: "#00D4FF", desc: "High attentional engagement and active processing",    class: "border-glow-cyan"   },
  Relaxed:    { color: "#00FF88", desc: "Baseline physiological state with low arousal",       class: "border-glow-green"  },
  Stressed:   { color: "#FF6B35", desc: "Heightened neural arousal and cognitive tension",         class: "border-glow-orange" },
  Distracted: { color: "#FFD700", desc: "Attentional shift; non-task-related processing",            class: "border-glow-amber"  },
  Drowsy:     { color: "#7B2FBE", desc: "Reduced alertness; theta-dominant neural patterns", class: "border-glow-violet" },
};

export default function CognitiveStateCard({ prediction }) {
  const state  = prediction?.cognitive_state;
  const cfg    = STATE_CONFIG[state] || {};
  const hasData = !!state;

  return (
    <motion.div
      className={`glass-card p-5 ${cfg.class || ""}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6B8BAE" }}>
        Cognitive State Analysis
      </p>

      <AnimatePresence mode="wait">
        {hasData ? (
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-1 mb-4">
              <h2
                className="font-display font-bold text-3xl leading-tight tracking-tight"
                style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.color}33` }}
              >
                {state.toUpperCase()}
              </h2>
              <p className="text-xs font-medium" style={{ color: "#6B8BAE" }}>{cfg.desc}</p>
            </div>

            {/* Probability data grid */}
            {prediction?.all_probabilities && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(prediction.all_probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .map(([s, p]) => (
                    <div
                      key={s}
                      className="status-badge text-[10px]"
                      style={{
                        background: s === state
                          ? `${(STATE_CONFIG[s]?.color || "#fff")}15`
                          : "rgba(255,255,255,0.02)",
                        color: s === state
                          ? (STATE_CONFIG[s]?.color || "#fff")
                          : "#6B8BAE",
                        border: `1px solid ${s === state
                          ? `${(STATE_CONFIG[s]?.color || "#fff")}33`
                          : "rgba(255,255,255,0.05)"}`,
                      }}
                    >
                      {s.toUpperCase()}: {(p * 100).toFixed(1)}%
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-bold uppercase tracking-widest" style={{ color: "#4B5B7E" }}>
              Sample Identifier: {prediction?.epochId ?? "N/A"} • Subject ID: {prediction?.subject ?? "N/A"}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-8"
          >
            <div className="w-12 h-12 border border-white/5 rounded-full flex items-center justify-center mb-4">
               <div className="w-2 h-2 bg-slate-700 rounded-full animate-pulse" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4B5B7E" }}>
              Awaiting Telemetry Ingestion
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
