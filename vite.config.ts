import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import dts from "vite-plugin-dts"
import { resolve } from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: resolve(__dirname, "./tsconfig.build.json"),
      outDir: "dist/types",
      // s: false, // Set to true if you want to ignore TS errors
      // logDiagnostics: true,
      insertTypesEntry: true
    })
  ],
  build: {
    lib: {
      // Entry point for your library
      // entry: 'src/index.ts',
      entry: resolve(__dirname, "src/index.ts"),
      // name: 'starknet-tokenkit', // Global variable name for the library
      // fileName: (format) => `token-kit.${format}.js`, // Output file name
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled into your library
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
