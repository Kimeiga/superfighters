import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
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
