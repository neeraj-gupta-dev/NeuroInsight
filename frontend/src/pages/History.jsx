// frontend/src/pages/History.jsx
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Navbar         from "../components/Navbar";
import SessionHistory from "../components/SessionHistory";
import API            from "../api/axios";

const STATE_STATS_COLORS = {
  Focused:    "#00D4FF",
  Relaxed:    "#00FF88",
  Stressed:   "#FF6B35",
  Distracted: "#FFD700",
  Drowsy:     "#7B2FBE",
};

export default function History() {
  const [sessions,    setSessions]    = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [clearing,    setClearing]    = useState(false);
  const [error,       setError]       = useState("");

  const fetchSessions = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get(`/api/sessions?page=${page}&limit=20`);
      setSessions(data.sessions);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load session history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(1); }, [fetchSessions]);

  const handleClear = async () => {
    if (!window.confirm("Clear all session history? This cannot be undone.")) return;
    setClearing(true);
    try {
      await API.delete("/api/sessions");
      setSessions([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 1 });
    } catch {
      setError("Failed to clear history.");
    } finally {
      setClearing(false);
    }
  };

  // Compute state distribution for mini stats
  const stateDist = sessions.reduce((acc, s) => {
    acc[s.cognitiveState] = (acc[s.cognitiveState] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ paddingTop: 64 }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="font-display font-bold text-2xl" style={{ color: "#E8F4FF" }}>
              Session History
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6B8BAE" }}>
              {pagination.total} total sessions recorded
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchSessions(pagination.page)} className="btn-ghost">
              ↻ Refresh
            </button>
            {sessions.length > 0 && (
              <button onClick={handleClear} disabled={clearing} className="btn-danger">
                {clearing ? "Clearing…" : "Clear All"}
              </button>
            )}
          </div>
        </motion.div>

        {/* State distribution mini-stats */}
        {sessions.length > 0 && (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {Object.entries(STATE_STATS_COLORS).map(([state, color]) => {
              const count = stateDist[state] || 0;
              const pct   = sessions.length ? ((count / sessions.length) * 100).toFixed(0) : 0;
              return (
                <div
                  key={state}
                  className="glass-card p-4 text-center"
                  style={{ borderColor: `${color}33` }}
                >
                  <p className="text-2xl font-display font-bold" style={{ color }}>
                    {count}
                  </p>
                  <p className="text-xs font-medium mt-1" style={{ color: "#E8F4FF" }}>{state}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B8BAE" }}>{pct}%</p>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mb-6 p-3 rounded-xl text-sm"
            style={{ background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)", color: "#FF3366" }}
          >
            {error}
          </div>
        )}

        {/* Table */}
        <SessionHistory
          sessions={sessions}
          loading={loading}
          pagination={pagination}
          onPageChange={fetchSessions}
        />
      </div>
    </div>
  );
}
