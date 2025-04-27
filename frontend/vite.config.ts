import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Pages from 'vite-plugin-pages';
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      plugins: [fixReactVirtualized],
    },
  },
  resolve: {
    alias: [
      { find: 'components', replacement: '/src/components' },
      { find: 'lib', replacement: '/src/lib' }
    ],
  },
  plugins: [react(), Pages()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000'
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://backend:5000',
      },
    }
  },
  build: {
    minify: false,
  },
});
