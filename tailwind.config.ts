import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        genesis: {
          red: "#E01F27",
          maroon: "#9A0000",
          crimson: "#9A0000",
          gold: "#C9A24B",
          cream: "#FAF6F0",
        },
      },
      fontFamily: {
        display: ["'Poppins'", "sans-serif"],
        script: ["'Great Vibes'", "cursive"],
        handwriting: ["'Caveat'", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
