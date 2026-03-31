import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oak: {
          DEFAULT: "#8B6914",
          light: "#C4A35A",
          pale: "#F5EFE0",
          bg: "#FAF7F0",
        },
        dark: "#1A1A18",
        grey: {
          DEFAULT: "#6B6B63",
          light: "#A8A89E",
          lighter: "#D4D0C8",
        },
        green: {
          DEFAULT: "#27AE60",
          bg: "#D5F5E3",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
