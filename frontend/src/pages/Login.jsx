// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate("/app");
      } else {
        setError("Invalid credentials. Access denied.");
      }
    } catch (err) {
      setError("Authentication error. Please verify network connectivity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background depth layers */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-cyan-400"
              style={{
                background: "rgba(0, 212, 255, 0.05)",
                border: "1px solid rgba(0, 212, 255, 0.2)",
                boxShadow: "0 0 20px rgba(0, 212, 255, 0.1)",
              }}
            >
              N
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-[#E8F4FF] mb-2 uppercase">
            Investigator Sign In
          </h1>
          <p className="text-[#6B8BAE] text-sm uppercase tracking-widest font-medium">
            NeuroInsight Analytical Pipeline
          </p>
        </div>

        <div className="glass-card p-8 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-bold uppercase tracking-widest"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3B4B6E] ml-1">
                Institutional Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                placeholder="name@institution.edu"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3B4B6E]">
                  Security Password
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.3em] transition-all duration-300 relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #00D4FF, #00A3FF)",
                color: "#FFFFFF",
                boxShadow: "0 10px 30px rgba(0, 212, 255, 0.2)",
              }}
            >
              <span className="relative z-10 font-black">
                {loading ? "AUTHENTICATING SESSION..." : "VERIFY ACCESS"}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-xs text-[#3B4B6E] font-medium uppercase tracking-widest">
              Unregistered Investigator?{" "}
              <Link
                to="/register"
                className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors ml-1"
              >
                Provision Account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[9px] text-[#3B4B6E] font-bold uppercase tracking-[0.3em] opacity-40 leading-relaxed">
            NeuroInsight Analytical Pipeline v2.2<br />
            PhysioNet EEGBCI Standard • Explainable AI Core
          </p>
        </div>
      </motion.div>
    </div>
  );
}
