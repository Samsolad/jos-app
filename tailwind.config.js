/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['Libre Baskerville', 'serif'],
      },
      colors: {
        bg: '#080808',
        bg1: '#111111',
        bg2: '#181818',
        bg3: '#1e1e1e',
        line: '#1f1f1f',
        line2: '#2a2a2a',
        line3: '#333333',
        dim: '#888888',
        dimmer: '#444444',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.3s ease',
        fadeIn: 'fadeIn 0.15s ease',
      },
    },
  },
  plugins: [],
}