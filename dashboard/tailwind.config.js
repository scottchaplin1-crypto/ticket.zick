/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        blurple: "#5865F2",
        surface: "#1e1f22",
        surface2: "#2b2d31",
        surface3: "#313338",
      },
    },
  },
  plugins: [],
};
