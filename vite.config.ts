import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base: the build runs from any sub-path (nginx root, claude.ai artifact).
  base: './',
  build: {
    // Inline flag SVGs and font files into the CSS: ~600 tiny files become one.
    assetsInlineLimit: (file) => (/\.(svg|woff2?)$/.test(file) ? true : undefined),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
