import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './', // Asegura paths relativos para cPanel/subdirectorios
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy server-side hacia football-data.org: evita el bloqueo CORS del navegador
      // y mantiene la API key fuera del bundle del cliente.
      proxy: {
        '/api/wc': {
          target: 'https://api.football-data.org/v4',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/wc/, ''),
          headers: {
            'X-Auth-Token': env.FOOTBALL_DATA_API_KEY || '',
          },
        },
      },
    },
  };
});
