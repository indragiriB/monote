import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
