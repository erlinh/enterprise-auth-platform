import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    proxy: {
      '/api/reporting': {
        target: 'http://localhost:5004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reporting/, '/api'),
      },
      '/api/authz': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/authz/, ''),
      },
    },
  },
});
