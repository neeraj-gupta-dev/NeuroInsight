// frontend/src/components/ConfidenceMeter.jsx
import { motion } from "framer-motion";

function Arc({ pct, color }) {
  const r    = 70;
  const cx   = 90;
  const cy   = 90;
  const circ = Math.PI * r;           // half-circle circumference
  const dash = (pct / 100) * circ;

  return (
    <svg width="180" height="100" viewBox="0 0 180 105">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={12}
        strokeLinecap="round"
      />
      {/* Fill */}
      <motion.path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {/* Percentage label */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fontSize={22}
        fontWeight={700}
        fontFamily="Space Grotesk"
        fill={color}
      >
        {pct.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={10} fill="#6B8BAE">
        confidence
      </text>
    </svg>
  );
}

const STATE_COLORS = {
  Focused:    "#00D4FF",
  Relaxed:    "#00FF88",
  Stressed:   "#FF6B35",
  Distracted: "#FFD700",
  Drowsy:     "#7B2FBE",
};

export default function ConfidenceMeter({ prediction }) {
  const confidence = prediction?.confidence ?? 0;
  const state      = prediction?.cognitive_state;
  const color      = STATE_COLORS[state] || "#00D4FF";
  const pct        = confidence * 100;

  return (
    <motion.div
      className="glass-card p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B8BAE" }}>
        Model Confidence
      </p>

      <div className="flex flex-col items-center">
        <Arc pct={pct} color={color} />

        {/* Gradient bar */}
        <div className="w-full mt-3 rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              boxShadow: `0 0 10px ${color}66`,
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex w-full justify-between mt-1">
          <span className="text-xs" style={{ color: "#6B8BAE" }}>0%</span>
          <span className="text-xs" style={{ color: "#6B8BAE" }}>100%</span>
        </div>
      </div>
    </motion.div>
  );
}
