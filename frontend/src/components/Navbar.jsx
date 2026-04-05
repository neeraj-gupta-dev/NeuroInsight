// frontend/src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/app",     label: "Dashboard", icon: "⬡" },
  { to: "/history",   label: "History",   icon: "◈" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(2, 8, 23, 0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,212,255,0.15)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/app" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{
              background: "linear-gradient(135deg, #00D4FF22, #7B2FBE22)",
              border: "1px solid rgba(0,212,255,0.4)",
              boxShadow: "0 0 15px rgba(0,212,255,0.2)",
            }}
          >
            🧠
          </div>
          <div>
            <span
              className="font-display font-bold text-base tracking-wide"
              style={{ color: "#00D4FF" }}
            >
              NeuroInsight
            </span>
            <span className="ml-1 text-xs font-medium text-gray-500">2.0</span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-2">
          {NAV_LINKS.map(({ to, label, icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: active ? "#00D4FF" : "#6B8BAE",
                  background: active ? "rgba(0,212,255,0.08)" : "transparent",
                }}
              >
                <span>{icon}</span>
                {label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{ border: "1px solid rgba(0,212,255,0.3)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Signed in as</p>
            <p className="text-sm font-medium" style={{ color: "#E8F4FF" }}>
              {user?.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost text-sm px-4 py-2"
          >
            Logout
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
