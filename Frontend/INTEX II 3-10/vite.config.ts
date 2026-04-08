import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Default matches Backend/HirayaHaven.Api launchSettings.json (http profile: localhost:5000).
// Override: VITE_API_BASE_URL=http://127.0.0.1:5051 npm run dev
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
