/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          900: '#001f4d',
        },
        dark: {
          bg: '#0a0d14',
          card: '#121722',
          border: '#1e2638',
          hover: '#1a2233',
        }
      },
    },
  },
  plugins: [],
};
