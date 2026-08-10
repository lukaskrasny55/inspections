/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f6f7',
          100: '#e7e9eb',
          200: '#c8ccd1',
          300: '#a1a8b0',
          400: '#6e7681',
          500: '#4a515a',
          600: '#2d3238',
          700: '#22262b',
          800: '#17191d',
          900: '#0d0e10',
        },
      },
    },
  },
  plugins: [],
}
