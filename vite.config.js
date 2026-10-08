import { defineConfig } from 'vite';
export default defineConfig({
  root: 'ui', base: './',
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, rolldownOptions: { input: ['ui/index.html', 'ui/bot.html'] } },
});
