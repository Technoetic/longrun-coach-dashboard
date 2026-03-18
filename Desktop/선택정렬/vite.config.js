import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  plugins: [viteSingleFile()],
  build: {
    outDir: '../dist',
    assetsInlineLimit: Infinity
  },
  test: {
    root: '.',
    include: ['tests/**/*.test.js']
  }
});
