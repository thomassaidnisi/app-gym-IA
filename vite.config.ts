import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import fs from 'fs';

function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/service-worker.js');
      if (!fs.existsSync(swPath)) return;
      const ts = Date.now().toString();
      const src = fs.readFileSync(swPath, 'utf-8');
      fs.writeFileSync(swPath, src.replaceAll('__BUILD_TS__', ts));
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), stampServiceWorker()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
