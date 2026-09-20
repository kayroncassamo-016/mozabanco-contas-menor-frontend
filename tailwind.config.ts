import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        moza: {
          red: "#D0021B",
          redDeep: "#9A0114",
          redSoft: "#FDE8EA",
          ink: "#1B1918",
          paper: "#FAF7F2",
          gold: "#E8A33D",
          slate: "#6B6864",
          line: "#E7E1D8",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,25,24,0.04), 0 8px 24px -12px rgba(27,25,24,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
