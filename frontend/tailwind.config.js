/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050508',
          surface: '#0b0c10',
          card: '#101116',
          panel: '#15171e',
          border: '#222530',
          'border-red': '#4a1520',
          red: '#ff1f3d',
          'red-bright': '#ff3856',
          'red-dim': '#d11530',
          'red-dark': '#8a0f22',
          'red-crimson': '#dc2626',
          'red-glow': 'rgba(255, 31, 61, 0.28)',
          'red-glow-subtle': 'rgba(255, 31, 61, 0.12)',
          // Aliased to red palette to eliminate yellow/green across legacy references
          yellow: '#ff1f3d',
          'yellow-dim': '#d11530',
          'yellow-glow': 'rgba(255, 31, 61, 0.25)',
          cyan: '#ff3856',
          'cyan-dim': '#d11530',
          'cyan-glow': 'rgba(255, 31, 61, 0.2)',
          text: '#f3f4f6',
          muted: '#8e93a6',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        tech: ['"Rajdhani"', '"Orbitron"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cyber-red': '0 0 16px rgba(255, 31, 61, 0.4)',
        'cyber-red-sm': '0 0 8px rgba(255, 31, 61, 0.25)',
        'cyber-yellow': '0 0 16px rgba(255, 31, 61, 0.35)',
        'cyber-cyan': '0 0 16px rgba(255, 31, 61, 0.35)',
        'cyber-panel': 'inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 20px rgba(0, 0, 0, 0.85)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s ease-in-out',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
};
