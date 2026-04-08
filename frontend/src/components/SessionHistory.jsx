// frontend/src/components/SessionHistory.jsx
import { motion } from "framer-motion";

const STATE_COLORS = {
  Focused:    "#00D4FF",
  Relaxed:    "#00FF88",
  Stressed:   "#FF6B35",
  Distracted: "#FFD700",
  Drowsy:     "#7B2FBE",
};

const STATE_ICONS = {
  Focused:    "",
  Relaxed:    "",
  Stressed:   "",
  Distracted: "",
  Drowsy:     "",
};

export default function SessionHistory({ sessions, loading, pagination, onPageChange }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="glass-card p-12 flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 mb-2 flex items-center justify-center">
          <div className="w-4 h-4 border border-slate-700 rounded-sm" />
        </div>
        <p className="text-base font-bold uppercase tracking-widest" style={{ color: "#E8F4FF" }}>No records identified</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#6B8BAE" }}>
          Initiate telemetry collection to populate database.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
              {["#", "State", "Confidence", "Subject", "Epoch", "Top SHAP Feature", "Timestamp"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#6B8BAE" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => {
              const color = STATE_COLORS[s.cognitiveState] || "#fff";
              
              // BUG 3 Fix: Safe reduce with fallback for empty or missing shapValues
              const topShap = s.shapValues && Object.keys(s.shapValues).length > 0
                ? Object.entries(s.shapValues).reduce((a, b) =>
                    Math.abs(b[1]) > Math.abs(a[1]) ? b : a,
                    ["None", 0]
                  )
                : null;

              return (
                <motion.tr
                  key={s._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3" style={{ color: "#6B8BAE" }}>
                    {(pagination.page - 1) * pagination.limit + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       <span className="font-semibold" style={{ color }}>
                        {s.cognitiveState}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: 48, background: "rgba(255,255,255,0.08)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(s.confidence || 0) * 100}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <span style={{ color: "#E8F4FF" }}>
                        {((s.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#E8F4FF" }}>
                    {s.subject ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#E8F4FF" }}>
                    #{s.epochId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {topShap && topShap[0] !== "None" ? (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: "rgba(0,212,255,0.1)",
                          color: "#00D4FF",
                          border: "1px solid rgba(0,212,255,0.2)",
                        }}
                      >
                        {topShap[0].replace(/_/g, " ")}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B8BAE" }}>
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
              style={
                p === pagination.page
                  ? { background: "rgba(0,212,255,0.15)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.4)" }
                  : { background: "transparent", color: "#6B8BAE", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
