// frontend/src/pages/LandingPage.jsx
import { motion } from "framer-motion";
import { Link }   from "react-router-dom";

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    className="glass-card p-8 border-t-2 border-transparent hover:border-cyan-500/50 transition-all duration-500 group"
    whileHover={{ y: -10 }}
  >
    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-500">{icon}</div>
    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
    <p className="text-sm leading-relaxed" style={{ color: "#6B8BAE" }}>{desc}</p>
  </motion.div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020817] text-[#E8F4FF] selection:bg-cyan-500/30">
      
      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-900">N</div>
          <span className="font-display font-bold text-xl tracking-tighter">NeuroInsight</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
          <a href="#problem" className="hover:text-cyan-400 transition-colors">The Gap</a>
          <a href="#solution" className="hover:text-cyan-400 transition-colors">Our Pipeline</a>
          <a href="#features" className="hover:text-cyan-400 transition-colors">Capabilities</a>
          <Link to="/login" className="px-5 py-2 rounded-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-all">Launch Dashboard</Link>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────── */}
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
              Real-Time <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Brain State</span> Monitoring
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto text-slate-400 leading-relaxed mb-12">
              Transforming raw EEG signals into explainable cognitive insights using state-of-the-art machine learning and neural visualization.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-cyan-500 text-slate-900 font-black text-lg hover:bg-cyan-400 hover:scale-105 transition-all shadow-2xl shadow-cyan-500/30">
                Launch System
              </Link>
              <a href="#" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all">
                View on GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Problem Section ────────────────────────────────────────── */}
      <section id="problem" className="py-32 px-8 border-y border-white/5 bg-slate-950/50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl font-display font-bold text-white mb-6">The Explainability Gap in Neurotech</h2>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              Modern BCI tools are often "black boxes"—providing predictions without context. In healthcare and high-stakes monitoring, understanding <strong>why</strong> a state was detected is as critical as the detection itself.
            </p>
            <ul className="space-y-4">
              {[
                "High hardware accessibility costs",
                "Lack of real-time explainable AI (XAI)",
                "Fragmented data pipelines",
                "Non-portable session reporting"
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
                 {`{ "error": "Insufficient Context", "status": "Predicting...", "confidence": "???" }`}
               </div>
            </div>
            <div className="absolute -top-4 -right-4 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-bold text-xs">
              Current Limitations
            </div>
          </div>
        </div>
      </section>

      {/* ── Solution Section ───────────────────────────────────────── */}
      <section id="solution" className="py-32 px-8">
        <div className="max-w-5xl mx-auto text-center mb-20">
          <h2 className="text-4xl font-display font-bold text-white mb-6">A Production-Grade Pipeline</h2>
          <p className="text-slate-400">From microvolts to structured cognitive intelligence.</p>
        </div>
        
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
           {[
             { step: "01", label: "EEG Intake", desc: "PhysioNet Data" },
             { step: "02", label: "PSD Extract", desc: "Welch Method" },
             { step: "03", label: "ML Inference", desc: "RandomForest" },
             { step: "04", label: "XAI Layer", desc: "SHAP Values" },
             { step: "05", label: "Streaming", desc: "SSE Passthrough" },
             { step: "06", label: "Analytics", desc: "Visual Deep-dive" }
           ].map((s, i) => (
             <div key={i} className="glass-card p-6 text-center border-b-4 border-cyan-500/20">
                <p className="text-[10px] font-black text-cyan-500 mb-2">{s.step}</p>
                <p className="text-xs font-bold text-white mb-1 uppercase tracking-tighter">{s.label}</p>
                <p className="text-[9px] text-slate-500">{s.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────────── */}
      <section id="features" className="py-32 px-8 bg-slate-950/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="📡" 
              title="Real-Time Streaming" 
              desc="Optimized node.js SSE proxy ensuring zero-buffer passthrough from ML cluster to browser client." 
            />
            <FeatureCard 
              icon="🧠" 
              title="Explainable ML" 
              desc="Real-time SHAP feature importance rendering, showing exactly which brain regions drive every prediction." 
            />
            <FeatureCard 
              icon="📈" 
              title="Cognitive Metrics" 
              desc="Advanced DSP calculating Attention, Relaxation, and Mental Load ratios at 400ms frequencies." 
            />
            <FeatureCard 
              icon="💾" 
              title="Session Analytics" 
              desc="Full historical drill-down of all brain sessions with high-resolution snapshot trending charts." 
            />
            <FeatureCard 
              icon="📄" 
              title="Brain Reports" 
              desc="One-click generation of professional research PDFs with clinical observations and trend captures." 
            />
            <FeatureCard 
              icon="⚖️" 
              title="Resilient Design" 
              desc="Production-ready auto-reconnect logic and global state persistence across dashboard navigation." 
            />
          </div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────────────────────── */}
      <section className="py-32 px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-12">The Research Stack</p>
           <div className="flex flex-wrap justify-center gap-4 text-xs font-bold">
              {[
                "MongoDB Atlas", "Express.js", "React 18", "Node.js 20", 
                "FastAPI", "Scikit-Learn", "SHAP XAI", "NumPy", 
                "Framer Motion", "Recharts", "TailwindCSS"
              ].map(tech => (
                <span key={tech} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                  {tech}
                </span>
              ))}
           </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="py-20 px-8 border-t border-white/5 text-center">
        <div className="max-w-5xl mx-auto">
           <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center font-black text-cyan-400 mx-auto mb-6">N</div>
           <p className="text-sm font-bold text-slate-400 mb-2">NeuroInsight BCI Platform</p>
           <p className="text-[10px] text-slate-600 uppercase tracking-widest">Built for Academic Research & Symposium Presentation • 2026</p>
        </div>
      </footer>
    </div>
  );
}
