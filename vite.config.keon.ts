import { defineConfig } from 'vite'
import { resolve } from 'path'

// Keon wallet entry points (starknet-tokenkit/keon-wallet and /keon-wallet/mobile).
// Built separately from the React UI bundle so they never pull React in, and
// so starknet, starknetkit and WalletConnect stay the dApp's own copies: the
// connector hands out starknet Account objects, which must come from the same
// starknet the dApp uses. Types come from the main build (dist/types/keon-wallet).
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist/keon-wallet',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/keon-wallet/index.ts'),
        mobile: resolve(__dirname, 'src/keon-wallet/mobile/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: (id) =>
        id === 'starknet' ||
        id.startsWith('starknet/') ||
        id === 'starknetkit' ||
        id.startsWith('starknetkit/') ||
        id.startsWith('@walletconnect/') ||
        id.startsWith('@starknet-io/'),
    },
  },
})
