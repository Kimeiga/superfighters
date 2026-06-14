import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const base = process.env.VITE_BASE_PATH || '/';
const buildId = process.env.GITHUB_SHA || String(Date.now());

export default defineConfig({
  base,
  define: {
    __SUPERFIGHTERS_BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    rollupOptions: {
      input: {
        game: resolve(__dirname, 'index.html'),
        debug: resolve(__dirname, 'debug.html'),
        editor: resolve(__dirname, 'level-editor.html'),
      },
    },
  },
});
