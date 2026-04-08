// frontend/src/components/SHAPChart.jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "framer-motion";

const FEATURE_LABELS = {
  delta_mean:         "Δ Mean Power",
  theta_mean:         "Θ Mean Power",
  alpha_mean:         "Α Mean Power",
  beta_mean:          "Β Mean Power",
  gamma_mean:         "Γ Mean Power",
  delta_std:          "Δ Power SD",
  theta_std:          "Θ Power SD",
  alpha_std:          "Α Power SD",
  beta_std:           "Β Power SD",
  gamma_std:          "Γ Power SD",
  theta_alpha_ratio:  "Θ/Α Spectral Ratio",
  beta_alpha_ratio:   "Β/Α Spectral Ratio",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "rgba(2,8,23,0.98)",
        border: "1px solid rgba(0,212,255,0.2)",
        borderRadius: 8,
        padding: "12px 16px",
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
        maxWidth: 260,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}
    >
      <p style={{ color: "#E8F4FF", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.label}</p>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
         <span style={{ color: "#4B5B7E" }}>Signal Weight:</span>
         <span style={{ color: d.value >= 0 ? "#00D4FF" : "#FF6B35", fontWeight: 800, fontFamily: "monospace" }}>
           {d.value >= 0 ? "+" : ""}{d.value.toFixed(6)}
         </span>
      </div>
      <p style={{ color: "#4B5B7E", marginTop: 4, fontStyle: "italic", fontSize: 10 }}>
        {d.value >= 0 ? "Positively correlated with current classification" : "Inversely correlated with current classification"}
      </p>
    </div>
  );
};

export default function SHAPChart({ prediction }) {
  const shapValues = prediction?.shap_values;

  if (!shapValues || Object.keys(shapValues).length === 0) {
    return (
      <div className="glass-card p-5 h-full flex flex-col items-center justify-center min-h-[240px]">
        <div className="w-10 h-10 border border-white/5 rounded-full flex items-center justify-center mb-4">
           <div className="w-2 h-2 bg-slate-800 rounded-full animate-pulse" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#4B5B7E]">
            Establishing signal feature attribution...
        </p>
      </div>
    );
  }

  const data = shapValues
    ? Object.entries(shapValues)
        .map(([key, value]) => ({
          key,
          label: FEATURE_LABELS[key] || key,
          value: parseFloat(value.toFixed(5)),
          absVal: Math.abs(value),
        }))
        .sort((a, b) => b.absVal - a.absVal)
        .slice(0, 10)
    : [];

  return (
    <motion.div
      className="glass-card p-5 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: "#E8F4FF" }}>
             Predictive Signal Attribution
          </h2>
          <p className="text-[10px] mt-0.5 font-medium" style={{ color: "#4B5B7E" }}>
            Cerebral feature contributions to classification · SHAP TreeExplainer
          </p>
        </div>
        <div
          className="px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase"
          style={{ background: "rgba(123,47,190,0.1)", color: "#7B2FBE", border: "1px solid rgba(123,47,190,0.2)" }}
        >
          XAI Core
        </div>
      </div>

      {data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-48 rounded-2xl"
          style={{ background: "rgba(0,212,255,0.02)", border: "1px dashed rgba(0,212,255,0.1)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#4B5B7E]">
              Feature data mapping in progress...
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.02)" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 9, fill: "#4B5B7E", fontWeight: 700 }} 
                tickLine={false} 
                axisLine={false}
                domain={["auto", "auto"]} 
              />
              <YAxis 
                type="category" 
                dataKey="label" 
                tick={{ fontSize: 9, fill: "#4B5B7E", fontWeight: 700 }} 
                width={120} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
               <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={12}>
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.value >= 0 ? "#00D4FF" : "#FF6B35"}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-8 mt-4 justify-center">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4B5B7E" }}>
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#00D4FF" }} />
              Positive Attribution
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4B5B7E" }}>
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#FF6B35" }} />
              Negative Attribution
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
