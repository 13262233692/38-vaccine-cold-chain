/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'deep-space': '#0A1628',
        'deep-space-light': '#0F1F3A',
        'deep-space-lighter': '#162A4A',
        'ice-blue': '#00D4FF',
        'ice-blue-dim': '#0099BB',
        'ice-blue-glow': 'rgba(0, 212, 255, 0.15)',
        'safe-green': '#00E676',
        'warn-amber': '#FFB300',
        'alert-red': '#FF2D55',
        'alert-red-glow': 'rgba(255, 45, 85, 0.3)',
        'panel-bg': 'rgba(15, 31, 58, 0.85)',
        'panel-border': 'rgba(0, 212, 255, 0.2)',
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'alert-flash': 'alertFlash 0.5s ease-in-out infinite alternate',
        'node-glow': 'nodeGlow 2s ease-in-out infinite',
        'data-flow': 'dataFlow 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
      },
      keyframes: {
        alertFlash: {
          '0%': { opacity: '0.7' },
          '100%': { opacity: '1' },
        },
        nodeGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px currentColor)' },
          '50%': { filter: 'drop-shadow(0 0 12px currentColor)' },
        },
        dataFlow: {
          '0%': { strokeDashoffset: '20' },
          '100%': { strokeDashoffset: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
