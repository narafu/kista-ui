import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KISTA',
    short_name: 'KISTA',
    description: 'Key Investment Strategy & Trading Automation',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FCEFE8',
    theme_color: '#B66951',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
