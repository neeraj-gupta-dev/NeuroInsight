// frontend/src/components/PerformanceChart.jsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass-card p-3 shadow-2xl"
      style={{
        background: "rgba(2,8,23,0.95)",
        border: "1px solid rgba(0,212,255,0.2)",
      }}
    >
      <p className="text-[10px] text-slate-500 mb-2">
        {new Date(label).toLocaleTimeString()}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5" style={{ color: p.color }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-white">
            {Math.round(p.value)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function PerformanceChart({ 
  id,
  buffer, 
  title = "Performance Correlation", 
  subtitle = "Attention vs Relaxation",
  metrics = [
    { key: "attention",  color: "#00D4FF", label: "Attention" },
    { key: "relaxation", color: "#00FF88", label: "Relaxation" }
  ]
}) {
  return (
    <motion.div
      id={id}
      className="glass-card p-5 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-tight" style={{ color: "#E8F4FF" }}>
            {title}
          </h3>
          <p className="text-[10px]" style={{ color: "#6B8BAE" }}>
            {subtitle}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={buffer}>
          <defs>
            {metrics.map((m) => (
              <linearGradient key={`grad-${m.key}`} id={`color-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="timestamp" 
            hide 
          />
          <YAxis 
            hide 
            domain={[0, 100]} 
          />
          <Tooltip content={<CustomTooltip />} />
          {metrics.map((m) => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#color-${m.key})`}
              name={m.label}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

