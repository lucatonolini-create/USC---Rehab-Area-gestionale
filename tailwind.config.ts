import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        usc: {
          blue: "#003087",
          gold: "#FFCC00",
          red: "#C8102E",
        },
      },
    },
  },
  plugins: [],
};

export default config;
