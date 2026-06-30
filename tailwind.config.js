/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        "2xs": ["0.7rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        "input": "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "input-focus": "0 0 0 3px rgb(59 130 246 / 0.1)",
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
      },
      colors: {
        sidebar: "#f8fafc",
        brand: {
          DEFAULT: "#2563eb",
          light:   "#3b82f6",
          subtle:  "#eff6ff",
        },
      },
    },
  },
  plugins: [],
};
