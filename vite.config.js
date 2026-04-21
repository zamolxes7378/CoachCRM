import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({ org: 'kotech', project: 'coach-crm', authToken: process.env.SENTRY_AUTH_TOKEN })
  ],
  server: {
    port: 5173,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 / rolldown requires manualChunks to be a function, not an object
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor'
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'ui-vendor'
          }
          // exceljs and file-saver are intentionally omitted — they are
          // dynamic-imported inside exportService.js so Vite creates a
          // separate split chunk that is NOT loaded on first paint.
        }
      }
    }
  }
})
