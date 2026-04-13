/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./modules/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#F55905",
        "on-primary": "#ffffff",
        surface: "#F7F7F7",
        "on-surface": "#1E1E1E",
        "surface-container": "#eeeeee",
        "surface-container-highest": "#e5e5e5",
        outline: "#767777",
        error: "#b02500",
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
      fontFamily: {
        headline: ["Cairo_700Bold"],
        "headline-semi": ["Cairo_600SemiBold"],
        "headline-regular": ["Cairo_400Regular"],
        body: ["Tajawal_400Regular"],
        "body-medium": ["Tajawal_500Medium"],
        "body-bold": ["Tajawal_700Bold"],
        label: ["Tajawal_500Medium"],
      },
    },
  },
  plugins: [],
};
