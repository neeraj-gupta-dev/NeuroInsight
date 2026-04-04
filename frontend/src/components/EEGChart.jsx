// frontend/src/components/EEGChart.jsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

const BAND_CONFIG = [
  { key: "delta_mean", color: "#7B2FBE", label: "δ Delta" },
  { key: "theta_mean", color: "#00D4FF", label: "θ Theta" },
  { key: "alpha_mean", color: "#00FF88", label: "α Alpha" },
  { key: "beta_mean",  color: "#FF6B35", label: "β Beta"  },
  { key: "gamma_mean", color: "#FFD700", label: "γ Gamma" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(2,8,23,0.95)",
        border: "1px solid rgba(0,212,255,0.3)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "#6B8BAE", marginBottom: 6 }}>t = {label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{Number(p.value).toFixed(3)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function EEGChart({ data, streaming }) {
  return (
    <motion.div
      className="glass-card p-5 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-base" style={{ color: "#E8F4FF" }}>
            Live EEG Band Powers
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6B8BAE" }}>
            Log₁₀ power spectral density · PhysioNet EEGBCI
          </p>
        </div>
        {streaming && (
          <div className="flex items-center gap-2">
            <div className="pulse-dot" style={{ background: "#00FF88" }} />
            <span className="text-xs font-medium" style={{ color: "#00FF88" }}>
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-48 rounded-xl"
          style={{ background: "rgba(0,212,255,0.03)", border: "1px dashed rgba(0,212,255,0.15)" }}
        >
          <span className="text-4xl mb-3" style={{ filter: "grayscale(0.5)" }}>📡</span>
          <p className="text-sm" style={{ color: "#6B8BAE" }}>
            Press <strong style={{ color: "#00D4FF" }}>Start Simulation</strong> to stream EEG data
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            {BAND_CONFIG.map(({ key, color, label }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                name={label}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
