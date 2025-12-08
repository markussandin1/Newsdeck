import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Outfit, DM_Sans, JetBrains_Mono } from 'next/font/google'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover', // iOS safe area support
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Newsdeck',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable} bg-gray-50 min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}