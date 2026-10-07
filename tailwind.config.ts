import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {50:'#F6F8FB',100:'#EDF1F6',200:'#DFE5EE',300:'#C8D1DF',400:'#97A3B8',500:'#66748C',600:'#4A566C',700:'#364158',800:'#1B2539',900:'#111A2B',950:'#0A101D'},
        blue: {50:'#EEF2FF',100:'#E0E7FF',200:'#C7D2FE',300:'#A5B4FC',400:'#7C8FF0',500:'#4F63E0',600:'#3F4FC4',700:'#3441A0',800:'#2B357F',900:'#232B63',950:'#151A3D'},
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
