const defaultTheme = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./ui/pages/**/*.{html,ts,tsx}", "./ui/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", ...defaultTheme.fontFamily.sans],
        serif: ["Merriweather", "serif"],
      },
      colors: {
        capri: "#33b8ff",
        aqua: "#33ffff",
      },
    },
  },
  plugins: [],
}
