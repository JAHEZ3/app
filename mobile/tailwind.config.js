/** @type {import('tailwindcss').Config} */
module.exports = {
content: [
  "./mobile_JAHEZ_MOBILE_APP/app/**/*.{js,jsx,ts,tsx}",
  "./mobile_JAHEZ_MOBILE_APP/components/**/*.{js,jsx,ts,tsx}",
],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
