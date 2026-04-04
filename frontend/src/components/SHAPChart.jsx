// frontend/src/components/SHAPChart.jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "framer-motion";

const FEATURE_LABELS = {
  delta_mean:         "δ Delta Power",
  theta_mean:         "θ Theta Power",
  alpha_mean:         "α Alpha Power",
  beta_mean:          "β Beta Power",
  gamma_mean:         "γ Gamma Power",
  delta_std:          "δ Std Dev",
  theta_std:          "θ Std Dev",
  alpha_std:          "α Std Dev",
  beta_std:           "β Std Dev",
  gamma_std:          "γ Std Dev",
  theta_alpha_ratio:  "θ/α Ratio",
  beta_alpha_ratio:   "β/α Ratio",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "rgba(2,8,23,0.95)",
        border: "1px solid rgba(0,212,255,0.3)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        maxWidth: 220,
      }}
    >
      <p style={{ color: "#E8F4FF", fontWeight: 600, marginBottom: 4 }}>{d.label}</p>
      <p style={{ color: d.value >= 0 ? "#00D4FF" : "#FF6B35" }}>
        SHAP: {d.value >= 0 ? "+" : ""}{d.value.toFixed(5)}
      </p>
      <p style={{ color: "#6B8BAE", marginTop: 4, fontSize: 11 }}>
        {d.value >= 0 ? "↑ Pushes toward prediction" : "↓ Pulls against prediction"}
      </p>
    </div>
  );
};

export default function SHAPChart({ prediction }) {
  const shapValues = prediction?.shap_values;

  // BUG 4 Fix: Return placeholder if SHAP data is missing or empty
  if (!shapValues || Object.keys(shapValues).length === 0) {
    return (
      <div className="glass-card p-5 h-full flex flex-col items-center justify-center min-h-[240px]">
        <span className="text-3xl mb-2">🔬</span>
        <p className="text-sm text-gray-400">Waiting for SHAP explanation…</p>
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
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-base" style={{ color: "#E8F4FF" }}>
             Explainable AI — SHAP Values
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6B8BAE" }}>
            Feature contributions to current prediction · TreeExplainer
          </p>
        </div>
        <div
          className="px-2 py-1 rounded text-xs font-semibold"
          style={{ background: "rgba(123,47,190,0.15)", color: "#7B2FBE", border: "1px solid rgba(123,47,190,0.3)" }}
        >
          XAI
        </div>
      </div>

      {data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-48 rounded-xl"
          style={{ background: "rgba(0,212,255,0.03)", border: "1px dashed rgba(0,212,255,0.15)" }}
        >
          <span className="text-3xl mb-2">🔬</span>
          <p className="text-sm" style={{ color: "#6B8BAE" }}>SHAP values appear after first prediction</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} domain={["auto", "auto"]} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B8BAE" }} width={105} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
               <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.value >= 0 ? "#00D4FF" : "#FF6B35"}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6B8BAE" }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: "#00D4FF" }} />
              Positive contribution
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6B8BAE" }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: "#FF6B35" }} />
              Negative contribution
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
