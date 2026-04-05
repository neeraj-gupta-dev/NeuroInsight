// frontend/src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register }       = useAuth();
  const navigate           = useNavigate();
  const [form, setForm]    = useState({ name: "", email: "", password: "" });
  const [error, setError]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,212,255,0.15))",
              border: "1px solid rgba(0,255,136,0.3)",
              boxShadow: "0 0 40px rgba(0,255,136,0.1)",
            }}
          >
            ⚡
          </motion.div>
          <h1 className="font-display font-bold text-2xl" style={{ color: "#E8F4FF" }}>
            Create your account
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B8BAE" }}>
            Join NeuroInsight 2.2 to start monitoring cognitive states
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5" id="register-form">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: "#6B8BAE" }}>
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
