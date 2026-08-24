import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Code-split heavy dashboard pages that are not needed on initial load
        manualChunks: {
          'analytics': ['./src/pages/dashboard/AnalyticsPage.tsx'],
          'campaigns': ['./src/pages/dashboard/CampaignsPage.tsx'],
          'calendar': ['./src/pages/dashboard/CalendarPage.tsx'],
          'post-editor': ['./src/pages/dashboard/PostEditorPage.tsx'],
          // React + react-dom always together in a shared vendor chunk
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
        },
      },
    },
    // Warn when any chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

