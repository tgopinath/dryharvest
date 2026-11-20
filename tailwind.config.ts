import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#176B36', deep: '#123D27', yellow: '#F5BC32', cream: '#FBFAF4', pale: '#EDF5E9', ink: '#17271C' },
      },
      fontFamily: {
        serif: ['Lato', 'system-ui', 'sans-serif'],
        sans: ['Lato', 'system-ui', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgba(23,39,28,.04), 0 8px 24px -12px rgba(23,39,28,.12)' },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
} satisfies Config;
