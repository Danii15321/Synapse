import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
    },
    extend: {
      colors: {
        background: "#FBF8F3",
        surface: "#FFFFFF",
        foreground: "#07183D",
        accent: "#1D25B5",
        muted: "#555762",
        indigo: "#1D25B5",
        magenta: "#C00062",
        orange: "#F15A00",
        success: "#24733F",
        error: "#A2142F",
        warning: "#C65A00",
      },
      fontFamily: {
        body: ["Inter", "system-ui", "sans-serif"],
        heading: ["Montserrat", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "synapse-gradient": "linear-gradient(90deg, #F15A00, #C00062, #1D25B5)",
      },
    },
  },
  plugins: [],
}

export default config
