/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef9ff',
          100: '#d9f1ff',
          200: '#bce7ff',
          300: '#8ed8ff',
          400: '#58c0f5',
          500: '#2ca2de',
          600: '#1683bd',
          700: '#12699a',
          800: '#125980',
          900: '#104a6a',
        },
        secondary: {
          50: '#effcff',
          100: '#d6f7fe',
          200: '#b4effc',
          300: '#7ee3f8',
          400: '#40ceec',
          500: '#1bb2d4',
          600: '#138eac',
          700: '#14738b',
          800: '#165d70',
          900: '#164d5e',
        },
      },
    },
  },
  plugins: [],
}
