// frontend/src/components/CognitiveStateCard.jsx
import { motion, AnimatePresence } from "framer-motion";

const STATE_CONFIG = {
  Focused:    { color: "#00D4FF", icon: "🎯", desc: "High attention & task engagement",    class: "border-glow-cyan"   },
  Relaxed:    { color: "#00FF88", icon: "🌿", desc: "Calm, low arousal mental state",       class: "border-glow-green"  },
  Stressed:   { color: "#FF6B35", icon: "⚡", desc: "Heightened arousal & tension",         class: "border-glow-orange" },
  Distracted: { color: "#FFD700", icon: "💫", desc: "Unfocused, mind wandering",            class: "border-glow-amber"  },
  Drowsy:     { color: "#7B2FBE", icon: "🌙", desc: "Low arousal, theta-dominant pattern", class: "border-glow-violet" },
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
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B8BAE" }}>
        Current Cognitive State
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
            <div className="flex items-center gap-4 mb-4">
              <motion.span
                className="text-5xl"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {cfg.icon}
              </motion.span>
              <div>
                <h2
                  className="font-display font-bold text-3xl leading-none"
                  style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.color}55` }}
                >
                  {state}
                </h2>
                <p className="text-xs mt-1" style={{ color: "#6B8BAE" }}>{cfg.desc}</p>
              </div>
            </div>

            {/* Probability pills */}
            {prediction?.all_probabilities && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(prediction.all_probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .map(([s, p]) => (
                    <div
                      key={s}
                      className="status-badge"
                      style={{
                        background: s === state
                          ? `${(STATE_CONFIG[s]?.color || "#fff")}22`
                          : "rgba(255,255,255,0.04)",
                        color: s === state
                          ? (STATE_CONFIG[s]?.color || "#fff")
                          : "#6B8BAE",
                        border: `1px solid ${s === state
                          ? `${(STATE_CONFIG[s]?.color || "#fff")}44`
                          : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {s}: {(p * 100).toFixed(1)}%
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-3 text-xs" style={{ color: "#6B8BAE" }}>
              Epoch #{prediction?.epochId ?? "—"} · Subject {prediction?.subject ?? "—"}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-6"
          >
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-sm" style={{ color: "#6B8BAE" }}>Awaiting EEG stream …</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
