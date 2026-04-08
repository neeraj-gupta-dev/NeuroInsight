// frontend/src/components/EEGChart.jsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

const BAND_CONFIG = [
  { key: "delta", color: "#7B2FBE", label: "δ (Delta)" },
  { key: "theta", color: "#00D4FF", label: "θ (Theta)" },
  { key: "alpha", color: "#00FF88", label: "α (Alpha)" },
  { key: "beta",  color: "#FF6B35", label: "β (Beta)"  },
  { key: "gamma", color: "#FFD700", label: "γ (Gamma)" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(2,8,23,0.98)",
        border: "1px solid rgba(0,212,255,0.2)",
        borderRadius: 8,
        padding: "12px 16px",
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}
    >
      <p style={{ color: "#4B5B7E", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Sample Interval {label}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 4, display: "flex", justifyContent: "space-between", gap: 20 }}>
          <span style={{ fontWeight: 600 }}>{p.name}:</span>
          <span style={{ fontFamily: "monospace", color: "#E8F4FF" }}>{Number(p.value).toFixed(4)}</span>
        </div>
      ))}
    </div>
  );
};

export default function EEGChart({ buffer, streaming }) {
  const chartData = buffer.map(s => ({
    epoch: s.epoch_id,
    ...s.bands
  }));

  return (
    <motion.div
      className="glass-card p-5 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: "#E8F4FF" }}>
            Cerebral Band Power Monitoring
          </h2>
          <p className="text-[10px] mt-0.5 font-medium" style={{ color: "#4B5B7E" }}>
            Cerebral spectral density analysis · PhysioNet EEGBCI Standard
          </p>
        </div>
        {streaming && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black tracking-widest text-green-500">REAL-TIME</span>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-48 rounded-2xl"
          style={{ background: "rgba(0,212,255,0.02)", border: "1px dashed rgba(0,212,255,0.1)" }}
        >
          <div className="w-10 h-10 border-2 border-slate-800 rounded-full flex items-center justify-center mb-4">
             <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4B5B7E" }}>
            Awaiting neural signal telemetry...
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="epoch" hide />
            <YAxis 
              tick={{ fontSize: 9, fill: "#4B5B7E", fontWeight: 600 }} 
              tickLine={false} 
              axisLine={false}
              domain={["auto", "auto"]} 
            />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
            <Legend
              wrapperStyle={{ fontSize: 9, paddingTop: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
              iconType="rect"
              iconSize={6}
            />
            {BAND_CONFIG.map(({ key, color, label }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                name={label}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
