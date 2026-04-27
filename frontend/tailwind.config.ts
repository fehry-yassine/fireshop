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
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
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
