/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core brand — pulled straight from the PalengkeScout logo
        palengke: {
          green: "#075C34", // pin / wordmark green — primary
          "green-dark": "#054526",
          "green-light": "#0F6B3E",
          red: "#C5211C", // awning / "Scout" red — secondary accent
          "red-dark": "#A31A16",
          gold: "#FEC502", // awning stripe — highlight / freshness / CTA glow
          "gold-dark": "#E0AC00",
        },
        cream: {
          DEFAULT: "#FBF7EC",
          soft: "#F3EDDD",
        },
        ink: {
          DEFAULT: "#1B2A22", // near-black w/ a green undertone, for text
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
    },
  },
  plugins: [],
};
