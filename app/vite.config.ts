import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE z. B. "/Schnitzeljagt-HH/" für GitHub Pages
const base = process.env.BASE ?? '/';

export default defineConfig({
  base,
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Schnitzeljagd Hamburg',
        short_name: 'Schnitzeljagd',
        description: 'Familien-Schnitzeljagd durch Winterhude, Barmbek-Nord und Alsterdorf',
        lang: 'de',
        theme_color: '#f9f1e1',
        background_color: '#f9f1e1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // neue Version sofort übernehmen
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Alle Texte und Stationsbilder sind sofort offline verfügbar
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,json,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // Kartenkacheln, die man sich angesehen hat, bleiben offline verfügbar
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
