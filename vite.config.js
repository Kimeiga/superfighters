import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
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
