// frontend/src/components/MetricsGauge.jsx
import { motion } from "framer-motion";

export default function MetricsGauge({ title, value, color }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <motion.div
      className="glass-card p-4 flex flex-col items-center justify-center relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute top-3 left-4 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6B8BAE" }}>
          {title}
        </span>
      </div>

      <div className="relative mt-4 flex items-center justify-center">
        <svg width="100" height="100" className="transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className="text-2xl font-bold font-display"
            style={{ color: "#E8F4FF" }}
          >
            {Math.round(value)}
          </motion.span>
          <span className="text-[8px] font-bold uppercase tracking-widest mt-[-2px]" style={{ color: "#6B8BAE" }}>
            Percentage
          </span>
        </div>
      </div>
      
      {/* Structural Accent */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 opacity-20"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </motion.div>
  );
}
