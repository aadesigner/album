import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Defaults so Railway/production builds work without Replit-style env injection.
// Set BASE_PATH=/ for a root domain; use e.g. /app/ if hosting under a subpath.
const basePath = process.env.BASE_PATH || '/';
const rawPort = process.env.PORT || '4173';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const apiTarget =
  process.env.API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:8787';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['konva', 'react-konva', 'framer-motion', 'react', 'react-dom'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Isolate the heaviest libraries into individually-cacheable chunks.
          // React itself is always needed, so co-locate react + react-dom.
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'vendor-react';
          if (id.includes('/node_modules/framer-motion/'))   return 'vendor-motion';
          if (id.includes('/node_modules/konva/')  || id.includes('/node_modules/react-konva/')) return 'vendor-konva';
          if (id.includes('/node_modules/lucide-react/'))    return 'vendor-icons';
          if (id.includes('/node_modules/@tanstack/'))       return 'vendor-query';
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        // 8080 is often taken on Windows by EDB/Apache; local API uses 8787.
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    // Production preview on Railway: forward /api to the api-server service.
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
