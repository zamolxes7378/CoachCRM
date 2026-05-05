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
        manualChunks(id) {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react';
          if (id.includes('@supabase/supabase-js')) return 'supabase';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('exceljs')) return 'excel';
        }
      }
    }
  }
})
