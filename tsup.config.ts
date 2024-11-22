import { defineConfig } from 'tsup';
import postcss from 'esbuild-plugin-postcss';
 
export default defineConfig({
    format: ['cjs', 'esm'],
    entry: ['./src/index.ts'],
    // injectStyle: true,
    dts: true,
    shims: true,
    skipNodeModulesBundle: true,
    clean: true,
    minify: true,
    bundle: true,
    // plugins: [
    //     postcss
    // ],
    // loader: {
    //     '.css': 'text'
    // }
});