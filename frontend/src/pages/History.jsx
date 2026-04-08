import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import PerformanceChart from "../components/PerformanceChart";
import { useEEGStream } from "../hooks/useEEGStream";
import { generateSessionReport } from "../utils/reportGenerator";

function StatCard({ label, value, color, icon, suffix = "%" }) {
  return (
    <div className="glass-card p-4 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-display font-bold text-white">{value}</span>
        <span className="text-xs text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

export default function History() {
  const { sessions, clearHistory } = useEEGStream();
  const [selectedSession, setSelectedSession] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!selectedSession) return;
    setGenerating(true);
    try {
      await generateSessionReport(selectedSession);
    } catch (err) {
      alert("Failed to generate report. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  if (selectedSession) {
    const s = selectedSession;
    return (
      <div className="min-h-screen pb-12" style={{ paddingTop: 64 }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button 
            onClick={() => setSelectedSession(null)}
            className="mb-6 flex items-center gap-2 text-xs font-bold text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            ← Back to Sessions
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 mb-2">Cerebral Diagnostic Analytics</p>
              <h1 className="text-3xl font-display font-bold text-white">
                {new Date(s.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Initiated at {new Date(s.startTime).toLocaleTimeString()} • Duration: {s.duration}s
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownload}
                disabled={generating}
                className="px-6 py-3 rounded-2xl bg-cyan-500 text-slate-900 text-xs font-black uppercase tracking-[0.2em] hover:bg-cyan-400 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {generating ? "PREPARING..." : "EXPORT NEURAL ANALYTICS (PDF)"}
              </button>

              <div className="bg-white/5 rounded-2xl px-6 py-3 border border-white/10">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">RECORD ID</p>
                <p className="text-xs font-mono text-slate-300">{s.id}</p>
              </div>
            </div>
          </div>

          {/* Aggregate Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Mean Attention" value={s.averages.attention} color="#00D4FF" icon="" />
            <StatCard label="Mean Relaxation" value={s.averages.relaxation} color="#00FF88" icon="" />
            <StatCard label="Mean Stress" value={s.averages.stress} color="#FF3366" icon="" />
            <StatCard label="Peak Engagement" value={s.peaks.maxEngagement} color="#7B2FBE" icon="" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceChart 
              id="performance-chart-1"
              buffer={s.snapshots} 
              title="Cerebral Load Balance" 
              subtitle="Attention & Relaxation trends"
              metrics={[
                { key: "attention",  color: "#00D4FF", label: "Attention" },
                { key: "relaxation", color: "#00FF88", label: "Relaxation" }
              ]}
            />
            <PerformanceChart 
              id="performance-chart-2"
              buffer={s.snapshots} 
              title="Psychological Stress Response" 
              subtitle="Stress & Engagement trends"
              metrics={[
                { key: "stress",     color: "#FF3366", label: "Stress" },
                { key: "engagement", color: "#7B2FBE", label: "Engagement" }
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ paddingTop: 64 }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight">Cerebral Archives</h1>
            <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">Research Record Cache ({sessions.length}/50)</p>
          </div>
          {sessions.length > 0 && (
            <button 
              onClick={clearHistory}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            >
              PURGE ARCHIVE
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
              <div className="w-6 h-6 border-2 border-slate-700 rounded-lg animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">No Records Detected</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Completed session telemetry will be archived here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {sessions.map((s, idx) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedSession(s)}
                  className="glass-card p-6 cursor-pointer hover:border-cyan-500/40 group transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black tracking-widest text-cyan-500 uppercase">
                      {s.duration}s Session
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                    {new Date(s.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </h3>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Avg Focus</p>
                      <p className="text-sm font-display font-bold text-cyan-400">{s.averages.attention}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Avg Stress</p>
                      <p className="text-sm font-display font-bold text-red-400">{s.averages.stress}%</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

