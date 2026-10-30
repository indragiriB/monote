/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        dot: ['"Doto"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Strict B&W scale — the only colour is the Nothing-style red accent.
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
          950: '#f4f4f1',
          1000: '#ffffff',
        },
        accent: {
          DEFAULT: '#d71921',
          soft: '#ff3b30',
        },
      },
      borderRadius: {
        DEFAULT: '16px',
        sm: '10px',
        md: '18px',
        lg: '24px',
        xl: '28px',
        '2xl': '32px',
        '3xl': '40px',
      },
      boxShadow: {
        none: 'none',
        glass: '0 24px 60px -28px rgba(0, 0, 0, 0.35)',
        'glass-dark': '0 24px 60px -28px rgba(0, 0, 0, 0.9)',
        glow: '0 0 24px rgba(215, 25, 33, 0.45)',
      },
      backgroundImage: {
        'dot-grid':
          'radial-gradient(circle, rgba(0, 0, 0, 0.16) 1px, transparent 1.5px)',
      },
      backgroundSize: {
        dots: '18px 18px',
      },
    },
  },
  plugins: [],
}
