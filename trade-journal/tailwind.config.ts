import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1d4ed8",
          light: "#93c5fd",
          dark: "#1e3a8a"
        },
        up: "#15803d",
        down: "#b91c1c"
      }
    }
  },
  plugins: []
};

export default config;
