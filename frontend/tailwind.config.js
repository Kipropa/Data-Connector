/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["Nunito Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      colors: {
        orange: {
          DEFAULT: "#FF6B1A",
          50:  "#FFF3EC",
          100: "#FFE0C8",
          200: "#FFB380",
          300: "#FF8C42",
          400: "#FF6B1A",
          500: "#E55500",
          600: "#B34200",
          700: "#803000",
          800: "#4D1D00",
          900: "#1A0A00",
        },
        green: {
          DEFAULT: "#2ECC71",
          50:  "#EAFAF1",
          100: "#C8F3DC",
          200: "#9BE8BD",
          300: "#52D98C",
          400: "#2ECC71",
          500: "#22A85C",
          600: "#178048",
          700: "#0D5530",
          800: "#072B18",
          900: "#020E08",
        },
        surface: {
          DEFAULT: "#171717",
          50:  "#F5F5F0",
          100: "#EEEAE0",
          200: "#D8D5CC",
          700: "#2A2A2A",
          800: "#1F1F1F",
          850: "#171717",
          900: "#0F0F0F",
          950: "#080808",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseSoft: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
      },
    },
  },
  plugins: [],
};
