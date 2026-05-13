import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Standalone SPA build for the playground (deployed to GitHub Pages).
// Library mode lives in vite.config.ts and is unaffected by this file.
export default defineConfig({
  plugins: [react()],
  base: '/starknet-tokenkit-package/',
  build: {
    outDir: 'dist-pages',
    emptyOutDir: true,
  },
});
