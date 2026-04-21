import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
