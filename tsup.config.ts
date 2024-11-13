import { defineConfig } from 'tsup'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
//   esbuildOptions(options) {
//     options.banner = {
//       js: `"use strict";`,
//     }
//   },
  esbuildPlugins: [],
  loader: {
    '.css': 'css'
  },
//   postcss: {
//     plugins: [autoprefixer()]
//   }
})