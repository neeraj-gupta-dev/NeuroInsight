/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:  ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      colors: {
        neural: {
          950: "#020817",
          900: "#050B18",
          800: "#0A1628",
          700: "#0F2040",
          600: "#163058",
        },
        cyan:   { DEFAULT: "#00D4FF", dark: "#00A8CC" },
        emerald:{ DEFAULT: "#00FF88", dark: "#00CC6A" },
        violet: { DEFAULT: "#7B2FBE", dark: "#5E1F92" },
        amber:  { DEFAULT: "#FFD700", dark: "#CCB000" },
        rose:   { DEFAULT: "#FF3366", dark: "#CC2952" },
        orange: { DEFAULT: "#FF6B35", dark: "#CC5529" },
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "glow":        "glow 2s ease-in-out infinite alternate",
        "scan":        "scan 2s linear infinite",
      },
      keyframes: {
        glow: {
          "0%":   { boxShadow: "0 0 5px rgba(0,212,255,0.3)"  },
          "100%": { boxShadow: "0 0 25px rgba(0,212,255,0.7)" },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)"  },
        },
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
};
