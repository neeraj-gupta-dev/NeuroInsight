// frontend/src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/app",     label: "CONTROL" },
  { to: "/history",   label: "HISTORY" },
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
      style={{
        background: "rgba(2, 8, 23, 0.9)",
        backdropFilter: "blur(24px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Diagnostic Logo */}
        <Link to="/app" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-lg bg-slate-900 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-sm shadow-[0_0_15px_rgba(0,212,255,0.1)]"
          >
            N
          </div>
          <div className="flex flex-col">
            <span
              className="font-display font-bold text-sm tracking-widest text-[#E8F4FF] uppercase"
            >
              NeuroInsight
            </span>
            <span className="text-[8px] font-black tracking-[0.2em] text-[#3B4B6E] uppercase">
              Analytical Pipeline v2.2
            </span>
          </div>
        </Link>

        {/* Global Navigation */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="relative px-5 py-2 text-[10px] font-black tracking-[0.2em] transition-all duration-300"
                style={{
                  color: active ? "#00D4FF" : "#4B5B7E",
                }}
              >
                {label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-[-1px] left-5 right-5 h-[2px] bg-cyan-500 shadow-[0_0_8px_rgba(0,212,255,0.5)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Investigator Access */}
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-[8px] font-black uppercase tracking-widest text-[#3B4B6E]">Access Authenticated</p>
            <p className="text-[11px] font-bold text-[#E8F4FF]">
              {user?.name?.toUpperCase()}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-lg border border-white/5 hover:border-red-500/30 hover:bg-red-500/5 text-[10px] font-black uppercase tracking-widest text-[#4B5B7E] hover:text-red-400 transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
