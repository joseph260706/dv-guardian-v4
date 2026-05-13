import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060912', surface: '#0d1117', card: '#161b27',
        border: '#1e2d45', accent: '#00d4ff', purple: '#7c3aed',
        success: '#10b981', warning: '#f59e0b', critical: '#ef4444',
        'text-primary': '#f1f5f9', 'text-secondary': '#64748b',
        'text-muted': '#334155',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"','monospace'],
        sans: ['"Inter"','sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
