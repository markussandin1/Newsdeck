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
        // New design system fonts
        display: ['var(--font-display)', 'sans-serif'],  // Outfit
        body: ['var(--font-body)', 'sans-serif'],        // DM Sans
        mono: ['var(--font-mono)', 'monospace'],         // JetBrains Mono

        // Make DM Sans the default sans font
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config
