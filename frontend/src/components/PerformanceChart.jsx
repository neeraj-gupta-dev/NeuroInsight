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
      className="glass-card shadow-2xl"
      style={{
        background: "rgba(2,8,23,0.98)",
        border: "1px solid rgba(0,212,255,0.2)",
        padding: "12px 16px",
        borderRadius: 8
      }}
    >
      <p className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
        Interval: {new Date(label).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between items-center gap-6 text-[11px] mb-1 last:mb-0">
          <span className="flex items-center gap-2 font-bold uppercase tracking-tighter" style={{ color: p.color }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono text-white font-bold">
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
  title = "Cognitive Metric Correlation", 
  subtitle = "Interactive Synchronic Attentional Analysis",
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#E8F4FF" }}>
            {title}
          </h3>
          <p className="text-[10px] font-medium mt-1 uppercase tracking-wider" style={{ color: "#4B5B7E" }}>
            {subtitle}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={buffer}>
          <defs>
            {metrics.map((m) => (
              <linearGradient key={`grad-${m.key}`} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
          <XAxis 
            dataKey="timestamp" 
            hide 
          />
          <YAxis 
            hide 
            domain={[0, 100]} 
          />
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
          {metrics.map((m) => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#grad-${m.key})`}
              name={m.label.toUpperCase()}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

