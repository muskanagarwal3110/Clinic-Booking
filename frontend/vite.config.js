import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // the browser talks to /api/v1 on the Vite origin; no CORS needed in development
    proxy: { '/api': 'http://localhost:3000' },
  },
});
