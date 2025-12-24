import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Zeigt Update-Banner statt silent update
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Monte - Montessori Kinderhaus',
        short_name: 'Monte',
        description: 'App für das Montessori Kinderhaus Berlin-Buch',
        theme_color: '#f59e0b',
        background_color: '#fcfaf7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Alte Caches beim Update löschen
        cleanupOutdatedCaches: true,
        // Neuen Service Worker sofort aktivieren
        skipWaiting: true,
        clientsClaim: true,
        // Cache-Strategien
        runtimeCaching: [
          {
            // API-Calls: Network First (immer frische Daten, Fallback auf Cache)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 Stunden
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Statische Assets: StaleWhileRevalidate (zeigt Cache, holt Update im Hintergrund)
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 Tag (vorher 30)
              }
            }
          },
          {
            // Supabase Storage (Bilder): Cache First
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 Tage
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  }
});
