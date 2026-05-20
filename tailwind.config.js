/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        accent: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        serif: ['Outfit', 'sans-serif'],
      },
      colors: {
        jos: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-2': 'var(--color-surface-2)',
          border: 'var(--color-border)',
          text: 'var(--color-text-primary)',
          muted: 'var(--color-text-secondary)',
          accent: 'var(--color-accent)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
          violet: 'var(--color-gradient-start)',
          blue: 'var(--color-gradient-end)',
        },
        bg: '#0F172A',
        bg1: '#1E293B',
        bg2: '#334155',
        line: '#334155',
        line2: '#475569',
        dim: '#94A3B8',
        dimmer: '#64748B',
      },
      backgroundImage: {
        'jos-gradient': 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))',
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 58, 237, 0.25)',
        'glow-cyan': '0 0 16px rgba(6, 182, 212, 0.35)',
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
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        breathe: {
          '0%, 80%, 100%': { transform: 'scale(0.65)', opacity: '0.45' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.3s ease',
        fadeIn: 'fadeIn 0.15s ease',
        gradientShift: 'gradientShift 4s ease-in-out infinite',
        breathe: 'breathe 1.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'jos-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'jos-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
