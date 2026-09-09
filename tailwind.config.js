/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d9f0ff',
          200: '#bce4ff',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
        },
        viet: {
          red: '#da251d',
          gold: '#ffcd00',
        },
        japan: {
          red: '#bc002d',
          indigo: '#1c2833',
        }
      }
    },
  },
  plugins: [],
}
