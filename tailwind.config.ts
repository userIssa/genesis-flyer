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
          maroon: "#7A0C1E",
          gold: "#C9A24B",
          cream: "#FBF6EE",
        },
      },
      fontFamily: {
        display: ["'Poppins'", "sans-serif"],
        script: ["'Great Vibes'", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
