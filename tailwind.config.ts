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
          muted: "#66758C",
          line: "#D7E2EE",
          surface: "#F6F9FC",
          accent: "#0B76BD",
          violet: "#5367B8",
          clay: "#22A6D5",
          mist: "#EAF4FB",
          warm: "#F6B35E",
        },
      },
      boxShadow: {
        soft: "0 18px 45px rgba(6, 28, 61, 0.08)",
        lift: "0 22px 60px rgba(6, 28, 61, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
