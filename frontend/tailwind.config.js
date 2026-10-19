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
          bg: '#070709',
          surface: '#0f1015',
          card: '#14161f',
          panel: '#1b1d28',
          border: '#2a2d3d',
          yellow: '#fcee0a',
          'yellow-dim': '#cfc408',
          'yellow-glow': 'rgba(252, 238, 10, 0.25)',
          cyan: '#00f0ff',
          'cyan-dim': '#00a3ad',
          red: '#ff003c',
          text: '#e6e8f0',
          muted: '#808599',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        tech: ['"Rajdhani"', '"Orbitron"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cyber-yellow': '0 0 15px rgba(252, 238, 10, 0.35)',
        'cyber-yellow-sm': '0 0 8px rgba(252, 238, 10, 0.25)',
        'cyber-cyan': '0 0 15px rgba(0, 240, 255, 0.35)',
        'cyber-panel': 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 20px rgba(0, 0, 0, 0.7)',
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
