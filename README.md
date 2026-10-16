# Starknet Tokenkit

[![npm version](https://img.shields.io/npm/v/starknet-tokenkit.svg)](https://www.npmjs.com/package/starknet-tokenkit)
[![npm downloads](https://img.shields.io/npm/dt/starknet-tokenkit)](https://www.npmjs.com/package/starknet-tokenkit)

A drop-in token selector for Starknet dApps. Themeable, keyboard-navigable, and built to slot into wallets, DEXes, and any UI that needs a tokens picker.

- **Live playground:** https://cycle-stark.github.io/starknet-tokenkit-package/
- **Docs:** https://docs.tokenkithq.io/docs/sdk/installation
- **Marketing site / list a token:** https://tokenkithq.io

Tested with React 19 and Next.js.

---

## Install

```bash
pnpm add starknet-tokenkit styled-components
# or
npm i starknet-tokenkit styled-components
```

`react`, `react-dom`, and `styled-components` are peer dependencies.

## Quick start

```tsx
import { useState } from 'react';
import {
  TokenKitWrapper,
  SelectTokenModal,
  themes,
  type IToken,
} from 'starknet-tokenkit';

export default function App() {
  const [selected, setSelected] = useState<IToken | null>(null);

  return (
    <TokenKitWrapper
      network="SN_MAIN"
      apiKey="YOUR_API_KEY"
      mainnetEndpoint="https://api.tokenkithq.io"
      sepoliaEndpoint="https://api.sepolia.tokenkithq.io"
      themeObject={themes.dark}
      options={{ tokensToLoad: 'public', enableRecent: true }}
    >
      <SelectTokenModal
        selectedToken={selected}
        callBackFunc={setSelected}
        modalWidth="420px"
        modalHeight="90dvh"
      >
        <button>Select Token</button>
      </SelectTokenModal>
    </TokenKitWrapper>
  );
}
```

The `children` of `SelectTokenModal` is your trigger element. Click it to open the modal.

## Components

| Component | Purpose |
|---|---|
| `TokenKitWrapper` | Top-level provider. Wraps `TokenKitProvider` + `ThemeProvider`. Configure once, near the root. |
| `SelectTokenModal` | Native `<dialog>`-based modal that wraps `SelectTokenContainer`. Use this if you want the click-to-open trigger pattern. |
| `SelectTokenContainer` | Inline (non-modal) version of the selector. Render it directly inside your own layout. |
| `TokenLogo` | Shared logo component. Falls back to initials if `logo` is empty **or** the image fails to load. |

## Options (`TokenKitOptions`)

Passed to `TokenKitWrapper` via the `options` prop.

| Option | Type | Default | Behavior |
|---|---|---|---|
| `tokensToLoad` | `'public' \| 'all'` | `'public'` | Which token set to load from the API. |
| `enableRecent` | `boolean` | `false` | **Opt in** to persisting and displaying a "Recent" tokens section. When `false`, nothing is read from or written to `localStorage`. |

## Modal props (`SelectTokenModal`, `SelectTokenContainer`)

| Prop | Type | Notes |
|---|---|---|
| `selectedToken` | `IToken \| null \| undefined` | Currently selected token (controlled). |
| `callBackFunc` | `(token: IToken) => void` | Called when a token is picked. |
| `modalWidth` | `string` | Optional. Defaults to `420px`. Auto-shrinks on mobile. |
| `modalHeight` | `string` | Optional. Defaults to theme `height` (e.g. `60dvh`). |

## Theming

The package ships several presets you can use as-is or fork.

```tsx
import { themes, type Theme } from 'starknet-tokenkit';

// Use a preset
<TokenKitWrapper themeObject={themes.lavender} ...>

// Or define your own
const myTheme: Theme = {
  colors: {
    textColor: '#f5f5f5',
    headerFooterBg: '#2c2c2c',
    background: '#1a1a1a',
    primaryColor: '#646cff',
    searchBackground: '#2c2c2c',
    searchColor: '#f5f5f5',
    searchBorderColor: '#444444',
    searchFocusBorderColor: '#646cff',
    placeholderColor: '#888888',
  },
  fonts: { fontFamily: "'Inter', sans-serif" },
  borderRadius: 20,
  height: '60dvh',
};
```

Available presets: `dark`, `light`, `blue`, `gradient`, `sunset`, `ocean`, `monochrome`, `emerald`, `lavender`, `ember`, `frost`, `carbon`, `candy`.

The `fonts.fontFamily` is honored across all elements (including native form controls — `<input>`, `<button>` — which normally ignore inherited `font-family`).

## Keyboard

- `↑` / `↓` — move focus through results
- `Enter` — select the focused token
- `Esc` — close the modal

## Starknet error messages

`parseStarknetError` and `formatStarknetError` turn starknet.js `RpcError`s, wallet errors, raw JSON-RPC errors or plain strings into plain-English messages plus structured flags. They are pure TypeScript with no React or runtime dependencies, so they tree-shake out when unused.

```ts
import { parseStarknetError, formatStarknetError } from 'starknet-tokenkit';

try {
  await account.execute(calls);
} catch (err) {
  const e = parseStarknetError(err, { tokens, calls }); // tokens: { address, symbol }[]
  if (e.isInsufficientBalance && e.confidence === 'certain') showTopUp(e.contractSymbol);
  toast(formatStarknetError(err, { tokens, calls })); // message + hint
}
```

What you get back:

- `kind`, `title`, `message`, `hint`, `retryable`, `code`
- `confidence`: `'certain'` (explicit reason or RPC code), `'likely'` (inferred), `'unknown'` (reason shown as is)
- `failingContract`, `failingEntrypoint`, `contractSymbol`: the function that actually failed. An Argent multicall failure is resolved to the failing call through its call index.
- `reason` (innermost, raw), `reasons` (every meaningful reason across frames), `frames`
- Flags, several of which can be true at once: `isInsufficientBalance`, `isInsufficientAllowance`, `isInsufficientFee`, `isSlippage`, `isSignature`, `isNonce`, `isUserRejected`, `isPermissionDenied`, `isNetwork`, `isContractPanic`, `isContractRevert`

It does not over-claim. A bare `u256_sub Overflow` is reported as an arithmetic panic in the function that failed ("The call to withdraw on 0x5e1f…5d6e failed: a number went below zero (u256_sub Overflow)."). It only becomes `insufficient_balance` with `confidence: 'likely'` when the failing frame is a known token's `transfer` / `transfer_from` / `burn`. An explicit reason such as `ERC20: insufficient balance` is `certain`.

Options:
- `tokens` names token contracts.
- `abi` names custom entrypoints.
- `calls` lets you pass the calls you sent when the error carries no calldata.
- `account` is the user's address. A missing contract at that address becomes `account_not_deployed`.

### Known error kinds

Every kind the parser can report is exported as a constant, so you can branch on it without string literals. `errors` lists every kind detected, primary first.

```ts
import { parseStarknetError, StarknetErrors, STARKNET_ERROR_KINDS } from 'starknet-tokenkit';

const e = parseStarknetError(err, { account: address });
if (e.errors.includes(StarknetErrors.ACCOUNT_NOT_DEPLOYED)) showDeployPrompt();
else if (e.kind === StarknetErrors.CONTRACT_NOT_FOUND) showWrongNetwork(e.failingContract);
```

| Constant | Meaning |
|---|---|
| `CONTRACT_NOT_FOUND` | No contract at the address on this network (RPC 20). `failingContract` names it. |
| `ACCOUNT_NOT_DEPLOYED` | The missing contract is the sender or the `account` you passed. |
| `ENTRYPOINT_NOT_FOUND`, `CLASS_HASH_NOT_FOUND`, `CLASS_ALREADY_DECLARED`, `COMPILED_CLASS_HASH_MISMATCH` | Node-level lookups and declares (21, 28, 51, 60). |
| `INSUFFICIENT_BALANCE`, `INSUFFICIENT_ALLOWANCE` | Token reverts, or a `u256_sub Overflow` on a known token transfer (`likely`). |
| `INSUFFICIENT_MAX_FEE`, `INSUFFICIENT_FEE_BALANCE`, `FEE_REJECTED`, `OUT_OF_GAS` | Fee problems (53, 54, account fee checks). |
| `INVALID_SIGNATURE`, `INVALID_NONCE`, `VALIDATION_FAILURE`, `SESSION_ERROR` | Account validation (52, 55). |
| `SLIPPAGE`, `DEADLINE_EXPIRED`, `ROUTE_UNAVAILABLE`, `LENDING_LIMIT` | DeFi reverts (AVNU, Ekubo, Vesu). |
| `UNAUTHORIZED_CALLER`, `PAUSED`, `REENTRANCY`, `INVALID_ADDRESS` | Contract guards. |
| `ARITHMETIC_OVERFLOW`, `DIVISION_BY_ZERO`, `UNWRAP_FAILED`, `INDEX_OUT_OF_BOUNDS` | Cairo core panics. |
| `CONTRACT_ERROR` | A revert with a reason the parser does not interpret (shown as is). |
| `USER_REJECTED`, `PERMISSION_DENIED` | Wallet answers (4001, 4100). |
| `RATE_LIMITED`, `NETWORK` | Node or connection trouble. |
| `UNKNOWN` | Not interpreted. The original message is kept. |

## Keon wallet

`starknet-tokenkit/keon-wallet` connects dApps to Keon, a Starknet wallet for Chrome and Android. It replaces the old `@keon-wallet/sdk` package: change the import path, the API is the same.

| Before | Now |
|---|---|
| `@keon-wallet/sdk` | `starknet-tokenkit/keon-wallet` |
| `@keon-wallet/sdk/mobile` | `starknet-tokenkit/keon-wallet/mobile` |

TypeScript SDK for integrating with **Keon Wallet** — a Starknet wallet available as a Chrome extension and mobile app (Android/iOS).

- **Browser extension** — injected wallet detection (`window.starknet_keon`)
- **Mobile** — WalletConnect v2 with automatic in-app browser detection
- **StarknetKit** — works as a connector with StarknetKit

### Installation

The connector ships inside `starknet-tokenkit`, under its own entry points, so it never pulls in TokenKit's React UI:

```bash
# Browser extension (injected wallet)
npm install starknet-tokenkit starknet

# Mobile (WalletConnect v2 and StarknetKit)
npm install starknet-tokenkit starknet starknetkit @walletconnect/sign-client
```

`starknet`, `starknetkit` and `@walletconnect/sign-client` are optional peer dependencies: the connector uses your app's copies, so the `Account` objects it returns come from the same `starknet` you use.

### Quick Start — Browser Extension

```typescript
import { detectKeonWallet, connect, getAccount } from 'starknet-tokenkit/keon-wallet'

// Wait for wallet to be available (handles extension injection timing)
const wallet = await detectKeonWallet()

// Connect to wallet (prompts user for approval)
const { address, chainId } = await connect()
console.log(`Connected: ${address} on ${chainId}`)

// Get account for transactions
const account = getAccount()

// Execute a transaction
const result = await account.execute({
  contractAddress: '0x...',
  entrypoint: 'transfer',
  calldata: ['0x...', '100', '0'],
})
console.log(`Transaction hash: ${result.transaction_hash}`)
```

### Mobile — WalletConnect v2

The mobile connector automatically detects if the dApp is running inside Keon Wallet's in-app browser (uses injected wallet) or externally (uses WalletConnect).

```typescript
import { KeonMobileConnector, isInKeonMobileBrowser } from 'starknet-tokenkit/keon-wallet/mobile'

const connector = KeonMobileConnector.init({
  options: {
    dappName: 'My dApp',
    url: window.location.hostname,
    projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  },
})

// Use with StarknetKit
import { connect } from 'starknetkit'

const result = await connect({
  connectors: [connector],
  modalMode: 'alwaysAsk',
})
```

#### Environment Detection

| Environment | Connector Used | How it works |
|---|---|---|
| Inside Keon mobile browser | `InjectedConnector` | Reads `window.starknet_keon` directly |
| External mobile browser | `KeonMobileBaseConnector` | WalletConnect v2 deep link to Keon app |
| Desktop browser | `InjectedConnector` | Standard extension injection |

### StarknetKit Integration

Use Keon Wallet with StarknetKit's modal:

```typescript
import { connect } from 'starknetkit'
import { InjectedConnector } from 'starknetkit/injected'
import { KeonMobileConnector } from 'starknet-tokenkit/keon-wallet/mobile'

const result = await connect({
  connectors: [
    // Extension connector
    new InjectedConnector({
      options: { id: 'keon', name: 'Keon Wallet' },
    }),
    // Mobile connector (WalletConnect)
    KeonMobileConnector.init({
      options: {
        dappName: 'My dApp',
        url: window.location.hostname,
        projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
      },
    }),
  ],
  modalMode: 'alwaysAsk',
})

if (result.wallet) {
  console.log('Connected:', result.wallet.account.address)
}
```

### API Reference

#### Detection

| Function | Returns | Description |
|---|---|---|
| `isKeonWalletAvailable()` | `boolean` | Check if Keon Wallet extension is installed |
| `detectKeonWallet(options?)` | `Promise<KeonWallet>` | Wait for wallet to be available (default 3s timeout) |
| `getKeonWallet()` | `KeonWallet` | Get wallet instance, throws if not available |
| `tryGetKeonWallet()` | `KeonWallet \| undefined` | Get wallet instance or undefined |

#### Connection

| Function | Returns | Description |
|---|---|---|
| `connect(options?)` | `Promise<ConnectionState>` | Connect and get `{ isConnected, address, chainId }` |
| `disconnect()` | `void` | Clear local connection state |
| `getConnectionState()` | `ConnectionState` | Get current state without prompting user |

#### Account & Provider

| Function | Returns | Description |
|---|---|---|
| `getAccount()` | `KeonAccount` | Get connected account for transactions |
| `getProvider()` | `KeonProvider` | Get provider for read-only operations |
| `getNetwork()` | `Promise<NetworkInfo>` | Get active network info (id, name, chainId, rpcUrl) |
| `switchNetwork(chainId)` | `Promise<boolean>` | Request network switch |

#### Events

```typescript
import { subscribe, subscribeAll } from 'starknet-tokenkit/keon-wallet'

// Single event
const unsub = subscribe('accountsChanged', (accounts) => {
  console.log('Accounts:', accounts)
})

// Multiple events
const unsub = subscribeAll({
  accountsChanged: (accounts) => console.log('Accounts:', accounts),
  chainChanged: (chainId) => console.log('Chain:', chainId),
  disconnect: () => console.log('Disconnected'),
})

// Cleanup
unsub()
```

| Event | Data | Description |
|---|---|---|
| `accountsChanged` | `string[]` | Account selection changed |
| `networkChanged` | `string` | Network changed (chain ID) |
| `chainChanged` | `string` | Alias for networkChanged |
| `connect` | `{ chainId: string }` | Wallet connected |
| `disconnect` | `void` | Wallet disconnected |

### Error Handling

```typescript
import {
  WalletNotFoundError,
  WalletNotConnectedError,
  UserRejectedError,
  RequestTimeoutError,
} from 'starknet-tokenkit/keon-wallet'

try {
  await connect()
} catch (error) {
  if (error instanceof WalletNotFoundError) {
    console.log('Please install Keon Wallet')
  } else if (error instanceof UserRejectedError) {
    console.log('User rejected the connection')
  } else if (error instanceof RequestTimeoutError) {
    console.log('Request timed out')
  }
}
```

### React Example

```tsx
import { useState, useEffect } from 'react'
import { detectKeonWallet, connect, subscribe, getAccount, type KeonWallet } from 'starknet-tokenkit/keon-wallet'

function App() {
  const [wallet, setWallet] = useState<KeonWallet | null>(null)
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    detectKeonWallet()
      .then(setWallet)
      .catch(() => console.log('Wallet not found'))
  }, [])

  useEffect(() => {
    if (!wallet) return
    return subscribe('accountsChanged', (accounts: string[]) => {
      setAddress(accounts[0] || null)
    })
  }, [wallet])

  const handleConnect = async () => {
    const { address } = await connect()
    setAddress(address)
  }

  const handleTransfer = async () => {
    const account = getAccount()
    await account.execute({
      contractAddress: '0x...',
      entrypoint: 'transfer',
      calldata: ['0x...', '100', '0'],
    })
  }

  return (
    <div>
      {!wallet && <p>Please install Keon Wallet</p>}
      {wallet && !address && <button onClick={handleConnect}>Connect</button>}
      {address && (
        <>
          <p>Connected: {address}</p>
          <button onClick={handleTransfer}>Transfer</button>
        </>
      )}
    </div>
  )
}
```


## Development

```bash
pnpm install
pnpm dev                # playground at http://localhost:5173
pnpm run build:package  # build the library to dist/ (tsup)
pnpm run build:pages    # build the playground SPA to dist-pages/
pnpm run preview:pages  # preview the SPA build locally
```

Two Vite configs live in the repo:
- `vite.config.ts` — library mode (used by `pnpm build`)
- `vite.config.pages.ts` — SPA mode for the playground (used by `pnpm build:pages` and the Pages workflow)

## Releasing

Bump the version in `package.json`, push, then create a GitHub release. The `npm-publish.yml` workflow runs `npm run build && npm publish` on release creation.

## License

MIT
