import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Default: local HTTP API on 127.0.0.1:5051 (matches Backend launchSettings "http" profile).
// Override where the proxy sends /api: VITE_DEV_PROXY_TARGET=http://127.0.0.1:5001 npm run dev
// (VITE_API_BASE_URL in .env is still read here so one file can set the proxy target without
// breaking the client — see api.ts: in DEV the app uses relative /api only.)
const apiTarget =
  process.env.VITE_DEV_PROXY_TARGET ||
  process.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:5051';

export default defineConfig({
  // SPA: dev/preview fall back to index.html for deep links (e.g. refresh on /admin).
  // Production: keep staticwebapp.config.json and _redirects under public/ so they are copied to dist/.
  appType: 'spa',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
