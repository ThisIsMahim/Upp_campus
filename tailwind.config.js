/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EBEAFD',
          100: '#D7D5FB',
          200: '#AEAAF8',
          300: '#867FF4',
          400: '#5D54F1',
          500: '#4F46E5',
          600: '#2A20DC',
          700: '#1F17A8',
          800: '#150F74',
          900: '#0A0840'
        },
        background: '#F9FAFB',
        card: '#FFFFFF',
        border: '#E5E7EB',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
