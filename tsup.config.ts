// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: 'src/index.ts',
    compilerOptions: {
      jsx: 'react-jsx',
      types: ['node'],
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'esnext',
  tsconfig: './tsconfig.build.json', // Or './tsconfig.json'
  external: ['styled-components', 'react', 'react-dom'], // Ensure these are external
  noExternal: [], // Explicitly avoid forcing any dependencies into the bundle
  esbuildOptions(options) {
    // Ensure CommonJS output works with styled-components
    options.platform = 'node'; // Target Node.js environment
    options.target = 'esnext';
    options.format = 'cjs'
  },
});