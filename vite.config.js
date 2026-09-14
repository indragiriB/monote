import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Makes the web build installable as a standalone desktop app on
    // Linux (and any other) Chromium-based browser — "Install monote…"
    // in the browser menu, or the install icon in the address bar. Also
    // works as a PWA on mobile browsers as a bonus, separate from the
    // native Capacitor Android build.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'monote',
        short_name: 'monote',
        description: 'Offline-first, B&W minimalist note-taking app.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache everything Vite emits, plus the app shell, so the
        // "desktop app" keeps working (or at least keeps opening) offline.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
  // Capacitor loads the built app from the filesystem (capacitor://), so it
  // needs relative asset paths ('./'). GitHub Pages project sites are
  // served from a subpath (https://<user>.github.io/<repo>/), so the
  // `deploy` npm script overrides this via VITE_BASE_PATH — see
  // package.json's `predeploy` script and README's "Deploying to GitHub
  // Pages" section.
  base: process.env.VITE_BASE_PATH || './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
