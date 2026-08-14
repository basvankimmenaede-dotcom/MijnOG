import './globals.css'

export const metadata = {
  title: 'Mijn OG',
  description: 'Jouw team. Jouw stats. Jouw club.',
  icons: {
    icon: '/og-logo.png',
    shortcut: '/og-logo.png',
    apple: '/og-logo.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mijn OG'
  }
}

export const viewport = {
  themeColor: '#f36f21',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
