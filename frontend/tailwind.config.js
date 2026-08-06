/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#45DEC4",
          dim: "#2FBFA8",
        },
        ink: {
          light: "#1A1D1F",
          dark: "#EDEFF1",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#14181B",
        },
        canvas: {
          light: "#F5F7FA",
          dark: "#0C0F11",
        },
        muted: {
          light: "#6B7280",
          dark: "#9AA3AB",
        },
        line: {
          light: "rgba(26,29,31,0.08)",
          dark: "rgba(237,239,241,0.10)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
