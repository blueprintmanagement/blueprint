import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blueprint: {
          ink: "#061C3D",
          muted: "#64748B",
          line: "#D8E3EF",
          surface: "#F4F8FC",
          accent: "#0C73B8",
          violet: "#4157A8",
          clay: "#1BA7E1",
        },
      },
      boxShadow: {
        soft: "0 18px 45px rgba(24, 34, 47, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
