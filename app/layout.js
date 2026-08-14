import './globals.css'

export const metadata = {
  title: 'Mijn OG',
  description: 'Jouw team. Jouw stats. Jouw club.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
