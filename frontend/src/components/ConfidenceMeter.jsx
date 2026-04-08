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
      {/* Structural Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={14}
        strokeLinecap="round"
      />
      {/* Dynamic Data Fill */}
      <motion.path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 12px ${color}44)` }}
      />
      {/* Statistical value representation */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fontSize={28}
        fontWeight={800}
        fontFamily="Inter, sans-serif"
        fill="#E8F4FF"
      >
        {pct.toFixed(0)}%
      </text>
      <text 
        x={cx} 
        y={cy + 12} 
        textAnchor="middle" 
        fontSize={10} 
        fontWeight={700}
        fontFamily="Inter, sans-serif"
        fill="#4B5B7E" 
        className="uppercase tracking-[0.2em]"
      >
        Confidence Level
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
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#6B8BAE" }}>
        Statistical Confidence Analysis
      </p>

      <div className="flex flex-col items-center">
        <Arc pct={pct} color={color} />

        {/* Linear scale indicator */}
        <div className="w-full mt-4 rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.03)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color}66, ${color})`,
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex w-full justify-between mt-2">
          <span className="text-[9px] font-bold" style={{ color: "#3B4B6E" }}>0.0 P</span>
          <span className="text-[9px] font-bold" style={{ color: "#3B4B6E" }}>1.0 P</span>
        </div>
      </div>
    </motion.div>
  );
}
