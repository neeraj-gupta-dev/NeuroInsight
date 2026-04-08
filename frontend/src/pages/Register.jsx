// frontend/src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { signup }              = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await signup(name, email, password);
      if (success) {
        navigate("/app");
      } else {
        setError("Account creation failed. Email may already be registered.");
      }
    } catch (err) {
      setError("Registration error. Please verify network connectivity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background depth layers */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />

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
            Create Investigator Account
          </h1>
          <p className="text-[#6B8BAE] text-sm uppercase tracking-widest font-medium">
            NeuroInsight Analytical Pipeline
          </p>
        </div>

        <div className="glass-card p-8">
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
                Full Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="input-neural"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: "#6B8BAE" }}>
                Email Address
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input-neural"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: "#6B8BAE" }}>
                Password
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                className="input-neural"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg text-sm"
                style={{ background: "rgba(255,51,102,0.1)", color: "#FF3366", border: "1px solid rgba(255,51,102,0.3)" }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              id="register-submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#6B8BAE" }}>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold" style={{ color: "#00D4FF" }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
