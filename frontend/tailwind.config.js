/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wca: {
          blue: "#2563EB",
          dark: "#1E3A8A",
          accent: "#3B82F6",
        },
      },
    },
  },
  plugins: [],
}
