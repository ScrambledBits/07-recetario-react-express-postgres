import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy solo existe en modo desarrollo (servidor de Vite).
// En producción, alguien más debe reenviar /api al backend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
    },
  },
});
