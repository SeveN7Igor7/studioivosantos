/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FDF8F3',
          100: '#E8D5C4',
          200: '#E3A872',
          300: '#D89860',
        }
      }
    },
  },
  plugins: [],
};