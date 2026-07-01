/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#241252",
          light: "#3a2378",
          dark: "#160a36"
        },
        secondary: {
          DEFAULT: "#31206B",
          light: "#49358f",
          dark: "#20124b"
        },
        accent: {
          DEFAULT: "#F57C20",
          hover: "#FF8F3D",
          light: "#ffa761"
        },
        bg: {
          light: "#F8FAFC",
          dark: "#0a0518"
        },
        card: {
          light: "#FFFFFF",
          dark: "#150d2d"
        },
        border: {
          light: "#E2E8F0",
          dark: "#2b214a"
        }
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
      }
    },
  },
  plugins: [],
}
