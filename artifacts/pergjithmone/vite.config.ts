import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Defaults for production builds when env vars are not injected.
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

const apiConfigured = Boolean(process.env.API_URL || process.env.VITE_API_URL);
if (process.env.NODE_ENV === 'production' && !apiConfigured) {
  console.warn(
    '[pergjithmone] API_URL is not set. /api requests (categories, auth, etc.) will fail. ' +
      'Set API_URL on the Railway frontend service to your api-server URL.',
  );
}

/**
 * Answer /api/geo on the frontend itself using Cloudflare's CF-IPCountry.
 * When the site is proxied through Cloudflare → Railway frontend → API, the
 * country header is on the frontend request; the API (often not behind CF)
 * never sees it if we only proxy. Handling geo here fixes AL/XK language.
 */
function cloudflareGeoPlugin() {
  const handler = (
    req: { method?: string; url?: string; headers: Record<string, unknown> },
    res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void },
    next: () => void,
  ) => {
    const url = req.url?.split('?')[0] ?? '';

    // Fail fast in production when API_URL was never configured (avoids infinite spinner).
    if (
      process.env.NODE_ENV === 'production' &&
      !apiConfigured &&
      url.startsWith('/api/') &&
      url !== '/api/geo' &&
      url !== '/api/geo/'
    ) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        error: 'API_URL is not set on the frontend service. Point it at api-server.',
      }));
      return;
    }

    if (req.method !== 'GET' || (url !== '/api/geo' && url !== '/api/geo/')) {
      next();
      return;
    }
    const raw = String(req.headers['cf-ipcountry'] ?? 'XX').trim().toUpperCase();
    const country = /^[A-Z]{2}$/.test(raw) ? raw : 'XX';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(JSON.stringify({ country }));
  };

  return {
    name: 'cloudflare-geo',
    configureServer(server: { middlewares: { use: (fn: typeof handler) => void } }) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof handler) => void } }) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    cloudflareGeoPlugin(),
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
        xfwd: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    // Production preview on Railway: forward /api to the api-server service.
    // /api/geo is handled by cloudflareGeoPlugin before this proxy.
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
});
