import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar            from "../components/Navbar";
import EEGChart          from "../components/EEGChart";
import CognitiveStateCard from "../components/CognitiveStateCard";
import ConfidenceMeter   from "../components/ConfidenceMeter";
import SHAPChart         from "../components/SHAPChart";
import MetricsGauge      from "../components/MetricsGauge";
import PerformanceChart  from "../components/PerformanceChart";
import { useEEGStream }  from "../hooks/useEEGStream";

const STATUS_CONFIG = {
  idle:        { color: "#6B8BAE", label: "System Idle",  dot: "#6B8BAE" },
  connecting:  { color: "#FFD700", label: "Syncing...",   dot: "#FFD700" },
  live:        { color: "#00FF88", label: "Live Stream",  dot: "#00FF88" },
  error:       { color: "#FF3366", label: "Link Error",   dot: "#FF3366" },
};

export default function Dashboard() {
  const {
    streaming, eegBuffer, prediction, metrics,
    error, status, connectionStatus,
    startStream, stopStream, clearHistory,
    restoreSession,
  } = useEEGStream();

  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("neuro_last_session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        restoreSession(data);
        setIsRestored(true);
      } catch (err) { console.error("Restore failed", err); }
    }
  }, [restoreSession]);

  const handleStart = () => { setIsRestored(false); startStream(); };
  const handleClear = () => { setIsRestored(false); clearHistory(); };

  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const hasData = eegBuffer.length > 0;

  return (
    <div className="min-h-screen pb-12" style={{ paddingTop: 64 }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
              Neural Command Center
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6B8BAE" }}>
              BCI Stream v2.1 • 400ms Sampling • Subject Monitoring
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div 
              className="px-4 py-2 rounded-xl flex items-center gap-3 border transition-all duration-500"
              style={{
                background: `${sc.dot}10`,
                borderColor: `${sc.dot}30`,
                color: sc.color
              }}
            >
              <div className={`w-2 h-2 rounded-full ${streaming ? 'animate-pulse' : ''}`} style={{ background: sc.dot }} />
              <span className="text-xs font-bold uppercase tracking-widest">{sc.label}</span>
            </div>

            {!streaming ? (
              <button onClick={handleStart} className="btn-primary shadow-lg shadow-cyan-500/20">
                🚀 Initialize Stream
              </button>
            ) : (
              <button onClick={stopStream} className="btn-danger shadow-lg shadow-red-500/20">
                🛑 Terminate
              </button>
            )}
            
            <button onClick={handleClear} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              Reset
            </button>
          </div>
        </motion.div>

        {/* Status Messaging */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="mb-8 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center gap-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span className="text-lg">⚠️</span>
              <p><strong>System Error:</strong> {error} — Verify ML cluster status.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid Interface */}
        <div className="relative">
          {/* Waiting Overlay */}
          <AnimatePresence>
            {streaming && !hasData && (
              <motion.div 
                className="absolute inset-0 z-50 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center border border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ background: "rgba(10,15,30,0.4)" }}
              >
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Syncing Neural Link</h3>
                <p className="text-sm text-slate-400">Waiting for brain signal packet...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Real-time Gauges */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <MetricsGauge 
                title="Cognitive Stress" 
                value={metrics.stress} 
                color="#FF3366" 
                icon="⚡" 
              />
              <MetricsGauge 
                title="Task Engagement" 
                value={metrics.engagement} 
                color="#00D4FF" 
                icon="🏗️" 
              />
              <ConfidenceMeter prediction={prediction} />
            </div>

            {/* Main Visualizations */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <PerformanceChart buffer={eegBuffer} />
                <CognitiveStateCard prediction={prediction} />
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <EEGChart buffer={eegBuffer} streaming={streaming} />
                </div>
                <div className="xl:col-span-1">
                  <SHAPChart prediction={prediction} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Restoration Badge */}
        <AnimatePresence>
          {isRestored && !streaming && (
            <motion.div 
              className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-lg text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <span className="animate-pulse">●</span> Physical Session Cache Restored
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

