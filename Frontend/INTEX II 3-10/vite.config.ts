import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Default: HTTP API (launchSettings "http" profile, localhost:5000). Prefer this in dev so the
// proxy is not bounced through HTTPS redirects (which can drop Authorization on /api/auth/me).
// Override: VITE_API_BASE_URL=https://127.0.0.1:5001 npm run dev
const apiTarget = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

export default defineConfig({
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
