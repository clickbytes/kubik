import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    proxy: {
      '/world-config': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000',
    },
  },
  server: {
    proxy: {
      '/world-config': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000',
    },
  },
});
