import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Root vite config - delegates to frontend package for actual builds
// This is kept for development convenience (npm run dev:frontend from root)
export default defineConfig({
  plugins: [react()],
  root: './packages/frontend/src',
  build: {
    outDir: path.resolve(__dirname, './packages/frontend/dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@ngaj/shared': path.resolve(__dirname, './packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
