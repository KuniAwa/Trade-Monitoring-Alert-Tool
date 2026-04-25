import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{js,ts,tsx}", "./src/components/**/*.{js,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 50: "#f0f7f2", 700: "#2d4a3a", 800: "#1e3326", 900: "#122018" }
      }
    }
  },
  plugins: []
};

export default config;
