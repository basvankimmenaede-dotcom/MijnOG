export default function manifest() {
  return {
    name: 'Mijn OG',
    short_name: 'Mijn OG',
    description: 'Jouw team. Jouw stats. Jouw club.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f36f21',
    icons: [
      { src: '/og-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/og-logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
}
