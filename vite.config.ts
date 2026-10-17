/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Laag ta bAI',
        short_name: 'Laag ta bAI',
        description: 'Your AI travel buddy for Cebu heritage: scan landmarks, hear their stories, and explore.',
        theme_color: '#2B0E0E',
        background_color: '#2B0E0E',
        display: 'standalone',
        orientation: 'portrait', // SRS 3.6.1: portrait-only PWA
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        // Offline reading (SRS 3.6.3.2): cache landmark data the traveler has already opened.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/v1/landmarks') || url.pathname.startsWith('/v1/quests'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-content', networkTimeoutSeconds: 4, expiration: { maxEntries: 100 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
  build: {
    rolldownOptions: {
      output: {
        // Split large vendors so app updates don't re-download them.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|scheduler|@tanstack)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
