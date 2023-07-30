// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../../packages/ui-legacy/pages/**/*.{html,ts,tsx}",
    "../../packages/ui-legacy/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", ...defaultTheme.fontFamily.sans],
        serif: ["Merriweather", "serif"],
      },
      colors: {
        capri: "#33b8ff",
        aqua: "#33ffff",
        "rich-black": "#040404",
        "eerie-black": "#1e1e1e",
        "onyx-100": "#3b3b3b",
        "onyx-200": "#3e3e3e",
        "spanish-gray": "#949494",
        "neon-green": "#5cff33",
      },
    },
  },
  plugins: [],
};
