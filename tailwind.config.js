/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Strict B&W scale — no color, no tinted grays.
        ink: {
          0: '#000000',
          50: '#0a0a0a',
          100: '#111111',
          200: '#222222',
          300: '#333333',
          400: '#555555',
          500: '#777777',
          600: '#999999',
          700: '#bbbbbb',
          800: '#dddddd',
          900: '#e5e5e5',
          950: '#f5f5f5',
          1000: '#ffffff',
        },
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '0px',
        md: '2px',
        lg: '4px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
