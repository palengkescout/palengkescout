/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        palengke: {
          green: "#075C34",
          "green-dark": "#054526",
          "green-light": "#0F6B3E",
          red: "#C5211C", 
          "red-dark": "#A31A16",
          gold: "#FEC502", 
          "gold-dark": "#E0AC00",
        },
        cream: {
          DEFAULT: "#FBF7EC",
          soft: "#F3EDDD",
        },
        ink: {
          DEFAULT: "#1B2A22", 
          soft: "#4E5C53",
          faint: "#8A968D",
        },
        fresh: {
          green: "#1E9E5A", // 🟢 fresh
          amber: "#E8A317", // 🟡 aging
          red: "#D34B3D", // 🔴 stale
        },
      },
      fontFamily: {
        display: ["'Baloo 2'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 10px rgba(27, 42, 34, 0.06), 0 1px 2px rgba(27, 42, 34, 0.08)",
        tab: "0 -2px 12px rgba(27, 42, 34, 0.07)",
      },
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
      keyframes: {
        "podium-rise": {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.92)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "podium-glow": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.6" },
        },
        "crown-bounce": {
          "0%": { transform: "translate(-50%, 4px)", opacity: "0" },
          "60%": { transform: "translate(-50%, -2px)", opacity: "1" },
          "100%": { transform: "translate(-50%, 0)", opacity: "1" },
        },
      },
      animation: {
        "podium-rise": "podium-rise 420ms cubic-bezier(0.16,1,0.3,1) both",
        "podium-glow": "podium-glow 2.2s ease-in-out infinite",
        "crown-bounce": "crown-bounce 500ms cubic-bezier(0.34,1.56,0.64,1) 260ms both",
      },
    },
  },
  plugins: [],
};