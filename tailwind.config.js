/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sheat: {
          dark: '#1a1612',
          card: '#241f1a',
          gold: '#d4af37',
          goldLight: '#e6c86e',
          blue: '#2b50aa',
          blueHover: '#204090',
        }
      }
    },
  },
  plugins: [],
}
