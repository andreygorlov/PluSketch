import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true, // Required for Docker on Windows
    },
    proxy: {
      '/api': {
        // אם VITE_API_URL מוגדר, נשתמש בו
        // אחרת, ננסה http://localhost:3001 (להרצה מחוץ ל-Docker)
        // או http://api:3001 (להרצה בתוך Docker network)
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})

