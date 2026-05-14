import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Konsoliderat typografisystem (P1-8): Inter Tight + JetBrains Mono.
        // font-display och font-body är alias mot Inter Tight för
        // bakåtkompatibilitet i komponentklassnamn.
        display: ['var(--font-ui)', 'Inter Tight', 'sans-serif'],
        body: ['var(--font-ui)', 'Inter Tight', 'sans-serif'],
        ui: ['var(--font-ui)', 'Inter Tight', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-ui)', 'Inter Tight', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        }
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config
