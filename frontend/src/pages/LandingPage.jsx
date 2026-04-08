import { motion } from "framer-motion";
import { Link }   from "react-router-dom";

const FeatureCard = ({ title, desc }) => (
  <motion.div 
    className="glass-card p-8 border-t-2 border-transparent hover:border-cyan-500/50 transition-all duration-500 group"
    whileHover={{ y: -10 }}
  >
    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
    <p className="text-sm leading-relaxed" style={{ color: "#6B8BAE" }}>{desc}</p>
  </motion.div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020817] text-[#E8F4FF] selection:bg-cyan-500/30">
      
      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-900">N</div>
          <span className="font-display font-bold text-xl tracking-tighter">NeuroInsight</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
          <a href="#clinical" className="hover:text-cyan-400 transition-colors">Clinical Context</a>
          <a href="#architecture" className="hover:text-cyan-400 transition-colors">System Architecture</a>
          <a href="#features" className="hover:text-cyan-400 transition-colors">Diagnostic Features</a>
          <Link to="/login" className="px-5 py-2 rounded-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-all">Access Dashboard</Link>
        </div>
      </nav>

      {/* ── Technical Overview ─────────────────────────────────────────── */}
      <section className="relative pt-40 pb-20 px-8 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-8">
              Open Source BCI Analytics • v2.2
            </span>
            <h1 className="text-6xl md:text-8xl font-display font-black text-white leading-tight tracking-tighter mb-8">
              Advanced <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">EEG Processing</span> & Monitoring
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto text-slate-400 leading-relaxed mb-12">
              Transforming raw EEG signals into explainable cognitive intelligence using established neural-computation algorithms and machine learning.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-cyan-500 text-slate-900 font-black text-lg hover:bg-cyan-400 hover:scale-105 transition-all shadow-2xl shadow-cyan-500/30">
                Initialize System
              </Link>
              <a 
                href="https://github.com/neeraj-gupta-dev/NeuroInsight" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                Scientific Documentation (GitHub)
                <span>↗</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Clinical Gap Analysis ────────────────────────────────────────── */}
      <section id="clinical" className="py-32 px-8 border-y border-white/5 bg-slate-950/50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl font-display font-bold text-white mb-6">Mitigating the Explainability Gap</h2>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              Many contemporary BCI platforms function as "black boxes"—providing classifications without diagnostic context. In clinical environments, understanding the underlying neural drivers is as essential as the prediction itself.
            </p>
            <ul className="space-y-4">
              {[
                "High logistical barriers for medical-grade hardware",
                "Absence of real-time explainable AI (XAI) in diagnostics",
                "Fragmented neural data acquisition pipelines",
                "Limited session-reporting portability"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 p-2 overflow-hidden">
               <div className="h-full w-full rounded-2xl bg-[#020817] flex items-center justify-center font-mono text-[10px] text-cyan-500/40 p-8">
                 {`{ "error": "Insufficient Context", "status": "Inference...", "confidence": "---" }`}
               </div>
            </div>
            <div className="absolute -top-4 -right-4 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-bold text-xs">
              Legacy Limitations
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture Overview ───────────────────────────────────────── */}
      <section id="architecture" className="py-32 px-8">
        <div className="max-w-5xl mx-auto text-center mb-20">
          <h2 className="text-4xl font-display font-bold text-white mb-6">Standardized Analytical Architecture</h2>
          <p className="text-slate-400">Validated processing pipeline for neural telemetry and cognitive assessment.</p>
        </div>
        
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
           {[
             { step: "01", label: "Signal Acquisition", desc: "PhysioNet Standard" },
             { step: "02", label: "Feature Extraction", desc: "Welch PSD" },
             { step: "03", label: "ML Inference", desc: "RandomForest Pipeline" },
             { step: "04", label: "XAI Layer", desc: "SHAP Importance" },
             { step: "05", label: "Telemetry Stream", desc: "SSE Transmission" },
             { step: "06", label: "Diagnostic UI", desc: "High-Res Analytics" }
           ].map((s, i) => (
             <div key={i} className="glass-card p-6 text-center border-b-4 border-cyan-500/20">
                <p className="text-[10px] font-black text-cyan-500 mb-2">{s.step}</p>
                <p className="text-xs font-bold text-white mb-1 uppercase tracking-tighter">{s.label}</p>
                <p className="text-[9px] text-slate-500">{s.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* ── Diagnostic Capabilities ──────────────────────────────────────────── */}
      <section id="features" className="py-32 px-8 bg-slate-950/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Real-Time Telemetry" 
              desc="Optimized Node.js SSE implementation ensuring high-fidelity signal transmission with minimal latency." 
            />
            <FeatureCard 
              title="Explainable ML" 
              desc="Integrated SHAP feature importance rendering, identifying specific neural frequency drivers for each prediction." 
            />
            <FeatureCard 
              title="Standardized Metrics" 
              desc="Scientific DSP calculating Mental Load, Stress Index, and Engagement ratios at 400ms intervals." 
            />
            <FeatureCard 
              title="Clinical Documentation" 
              desc="Comprehensive historical analysis with session logging and high-resolution data trending." 
            />
            <FeatureCard 
              title="Diagnostic Reporting" 
              desc="Exportable analytical captures suitable for clinical review and research observations." 
            />
            <FeatureCard 
              title="Fault-Tolerant Streaming" 
              desc="Production-grade auto-resumption and watchdog timers ensuring continuous session monitoring." 
            />
          </div>
        </div>
      </section>

      {/* ── Technical Infrastructure ────────────────────────────────────────────── */}
      <section className="py-32 px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-12">Deployment Infrastructure</p>
           <div className="flex flex-wrap justify-center gap-4 text-xs font-bold">
              {[
                "MongoDB Cluster", "Express.js Engine", "React 18", "Node.js 20", 
                "FastAPI Core", "Scikit-Learn", "SHAP XAI", "NumPy", 
                "Framer Motion", "Recharts", "TailwindCSS"
              ].map(tech => (
                <span key={tech} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                  {tech}
                </span>
              ))}
           </div>
        </div>
      </section>

      {/* ── Application Footer ────────────────────────────────────────────────── */}
      <footer className="py-20 px-8 border-t border-white/5 text-center">
        <div className="max-w-5xl mx-auto">
           <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center font-black text-cyan-400 mx-auto mb-6">N</div>
           <p className="text-sm font-bold text-slate-400 mb-2">NeuroInsight Analysis Platform</p>
           <p className="text-[10px] text-slate-600 uppercase tracking-widest">Validated for Research & Clinical Demonstration • 2026</p>
        </div>
      </footer>
    </div>
  );
}
