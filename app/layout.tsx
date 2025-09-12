import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Breaking News Dashboard',
  description: 'Real-time breaking news dashboard POC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}