import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API = `http://127.0.0.1:${process.env.MYLIBRARY_PORT ?? 4310}`;
// xfwd: the API trusts X-Forwarded-For in --dev mode, so LAN clients hitting the Vite
// server are still recognized as non-loopback and must present the access token.
const proxy = { target: API, xfwd: true };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/trpc': proxy, '/api': proxy },
  },
  build: { sourcemap: true },
});
