/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1F3A',
          700: '#13294B',
        },
        teal: {
          DEFAULT: '#1C7293',
          light: '#3FA7B8',
        },
        orange: {
          DEFAULT: '#FF6B35',
        },
        canvas: '#F5F7F9',
        muted: {
          light: '#5B6B7A',
          dark: '#D7E2EA',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Cambria', 'Georgia', 'serif'],
        sans: ['Inter', '"Segoe UI"', 'Calibri', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(11, 31, 58, 0.12)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        'draw-in': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 600ms ease-in-out',
        'fade-up': 'fade-up 300ms ease-out',
      },
    },
  },
  plugins: [],
};
