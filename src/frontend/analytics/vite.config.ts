import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api/analytics': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/analytics/, '/api'),
      },
      '/api/authz': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/authz/, ''),
      },
    },
  },
});
