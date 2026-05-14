import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { JetBrains_Mono, Inter_Tight } from 'next/font/google'

// Konsoliderat typografisystem (P1-8): Inter Tight för all UI/text,
// JetBrains Mono för metadata/siffror. Tidigare användes parallellt
// Outfit (--font-display) och DM Sans (--font-body) - båda är borta.
// Tailwind-klasserna font-display, font-body och font-ui är alla
// alias mot Inter Tight (se tailwind.config.ts).
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
})

export const metadata: Metadata = {
  title: 'Newsdeck',
  description: 'Real-time news dashboard',
  applicationName: 'Newsdeck',
  icons: {
    icon: '/newsdeck-icon.svg',
    shortcut: '/newsdeck-icon.svg',
    apple: '/newsdeck-icon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Newsdeck',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // P3-11: undvik FOUC vid mörkt tema. defaultTheme i ThemeProvider är
    // 'dark' så vi sätter `class="dark"` och `color-scheme: dark` redan i
    // HTML innan React hydrerar. Annars blinkar appen vit i ett par
    // hundra millisekunder vid första laddningen.
    <html lang="en" suppressHydrationWarning className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${jetbrainsMono.variable} ${interTight.variable} min-h-screen`}
        style={{ background: 'oklch(0.16 0.02 245)' }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
