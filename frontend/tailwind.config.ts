import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        market: {
          50: "#fff4eb",
          100: "#ffe6d3",
          200: "#ffc8a3",
          300: "#efb66f",
          500: "#ff8137",
          600: "#ff672d",
          700: "#ff552f",
          800: "#e64a29",
          900: "#c43f24",
        },
        surface: {
          50: "#f3f4f6",
          100: "#e5e7eb",
          200: "#d1d5db",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        lift: "0 14px 34px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
