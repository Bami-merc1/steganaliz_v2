import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        // manualChunks must be a function in Rollup 3+ / Vite 5+
        manualChunks(id) {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('fflate')) {
            return 'vendor-zip';
          }
          if (id.includes('/src/data/')) {
            return 'curriculum';
          }
          if (id.includes('/src/engines/')) {
            return 'engines';
          }
          if (id.includes('/src/detectors/')) {
            return 'detectors';
          }
        },
      },
    },

    sourcemap: false,
    minify: 'esbuild',
  },

  worker: {
    format: 'es',
  },

  preview: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});