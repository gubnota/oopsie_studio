import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
  // Only imported assets are shipped; never copy public uploads or build caches.
  publicDir: false,
  envPrefix: ['VITE_'],
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'), 'process.env.NEXT_PUBLIC_APP_URL': '""' },
  server: { host: '127.0.0.1', port: 1420, strictPort: true },
  build: { outDir: '../../desktop-dist', emptyOutDir: true, target: 'safari15', sourcemap: false, chunkSizeWarningLimit: 1600 },
});
