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
