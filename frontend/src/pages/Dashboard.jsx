import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar            from "../components/Navbar";
import EEGChart          from "../components/EEGChart";
import CognitiveStateCard from "../components/CognitiveStateCard";
import ConfidenceMeter   from "../components/ConfidenceMeter";
import SHAPChart         from "../components/SHAPChart";
import MetricsGauge      from "../components/MetricsGauge";
import PerformanceChart  from "../components/PerformanceChart";
import { useEEGStream, StreamStatus } from "../context/EEGStreamContext";

const STATUS_CONFIG = {
  [StreamStatus.IDLE]:         { color: "#6B8BAE", label: "System Standby",      dot: "#6B8BAE" },
  [StreamStatus.CONNECTING]:   { color: "#FFD700", label: "Synchronizing...",    dot: "#FFD700" },
  [StreamStatus.CONNECTED]:    { color: "#00FF88", label: "Live Telemetry",     dot: "#00FF88" },
  [StreamStatus.RECONNECTING]: { color: "#FFD700", label: "Reconnecting...",     dot: "#FFD700" },
  [StreamStatus.DEGRADED]:     { color: "#FFA500", label: "Signal Degraded",     dot: "#FFA500" },
  [StreamStatus.ERROR]:        { color: "#FF3366", label: "Server Error",        dot: "#FF3366" },
  [StreamStatus.DISCONNECTED]: { color: "#6B8BAE", label: "Disconnected",      dot: "#6B8BAE" },
};

export default function Dashboard() {
  const {
    streaming, eegBuffer, prediction, metrics,
    error, status, hasReceivedFirstPacket,
    startStream, stopStream, handleClear,
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
      } catch (err) { /* Silent restore failure */ }
    }
  }, [restoreSession]);

  const handleStartAttempt = () => { setIsRestored(false); startStream(); };
  const handleResetAttempt = () => { setIsRestored(false); handleClear(); };

  const sc = STATUS_CONFIG[status] || STATUS_CONFIG[StreamStatus.IDLE];

  return (
    <div className="min-h-screen pb-12" style={{ paddingTop: 64 }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Diagnostic Header */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
              Neuro-Diagnostic Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6B8BAE" }}>
              BCI Analytical Pipeline v2.2 • 400ms High-Frequency Sampling • Subject Monitoring
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
              <button onClick={handleStartAttempt} className="btn-primary shadow-lg shadow-cyan-500/20">
                Establish Connection
              </button>
            ) : (
              <button onClick={stopStream} className="btn-danger shadow-lg shadow-red-500/20">
                Disconnect
              </button>
            )}
            
            <button onClick={handleResetAttempt} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              Reset Session
            </button>
          </div>
        </motion.div>

        {/* System Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="mb-8 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center gap-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p><strong>System Message:</strong> {error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytical Interface */}
        <div className="relative">
          {/* Connection Overlay */}
          <AnimatePresence>
            {streaming && !hasReceivedFirstPacket && (
              <motion.div 
                className="absolute inset-0 z-50 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center border border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ background: "rgba(10,15,30,0.4)" }}
              >
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Establishing Signal Connection</h3>
                <p className="text-sm text-slate-400">Awaiting neural telemetry data...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Real-time Telemetry Gauges */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <MetricsGauge 
                title="Mental Stress Index" 
                value={metrics.stress} 
                color="#FF3366" 
              />
              <MetricsGauge 
                title="Cognitive Engagement" 
                value={metrics.engagement} 
                color="#00D4FF" 
              />
              <ConfidenceMeter prediction={prediction} />
            </div>

            {/* Neuro-Visualizations */}
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

        {/* Data Recovery Indicator */}
        <AnimatePresence>
          {isRestored && !streaming && (
            <motion.div 
              className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-lg text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <span className="animate-pulse">●</span> Historical Session Cache Restored
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

