# TokenKit v3 — Future Feature Plan

## Completed

- [x] Uniswap-style token selection UI (vertical common tokens, name-primary list items)
- [x] Theme system with 13 presets and custom theme builder
- [x] Infinite scroll with IntersectionObserver pagination
- [x] Loading skeletons (common tokens + list items)
- [x] `TokenKitOptions` bag pattern (`tokensToLoad`, `network`)
- [x] Modal animations (fade + scale) with click-outside-to-close
- [x] Keyboard navigation (arrow keys + Enter to select)
- [x] Recent token selections (localStorage, max 6)
- [x] Remove individual recent tokens + Clear all
- [x] Input cleared on token selection
- [x] Theme playground in App.tsx (presets, custom builder, copy, docs)

---

## Proposed Features

### 1. Token Balance Display
Show the user's token balance next to each token in the list. The dApp developer passes the active wallet address via the options bag — TokenKit stays wallet-agnostic (no starknet-react / get-starknet dependency).

**Approach:**
1. DApp passes `accountAddress` through options: `options={{ accountAddress: '0x123...' }}`
2. When `accountAddress` is present, fetch held tokens from the TokenKit API (endpoint returns tokens the address holds)
3. Multicall `balanceOf` for just those tokens (small subset, ~10-30, not the full list)
4. Map balances onto the token list in the UI

**UI changes:**
- Display formatted balance on the right side of each TokenListItem
- Sort tokens with balance to the top of the list
- When `accountAddress` is absent, no balance features activate — works as it does now

### 2. Token Favorites / Pinned Tokens
Let users pin tokens that always appear at the top, separate from recent selections.

- Star/pin icon on each token item
- Persisted in localStorage under separate key
- Dedicated "Favorites" section above "Recent"

### 3. Custom Token Import
Allow users to paste a contract address to add unlisted tokens.

- Address input field with validation
- Fetch token metadata from on-chain (name, symbol, decimals)
- Add to a "Custom Tokens" localStorage list
- Show warning badge for unverified custom tokens

### 4. Multi-Token Selection Mode
Support selecting multiple tokens (useful for portfolio views or multi-swap interfaces).

- Optional `multiSelect` prop
- Checkbox UI instead of single-click select
- `onSelect` callback receives array of tokens
- Selected tokens shown as removable chips

### 5. Token Search Enhancements
- Fuzzy search (match partial names/symbols even with typos)
- Search by contract address (paste full address to find token)
- Search history (recent search terms)

### 6. Accessibility Improvements
- Full ARIA attributes on all interactive elements
- Screen reader announcements for loading states and selection
- Focus trap within modal when open
- High contrast theme preset
- Reduced motion support (`prefers-reduced-motion`)

### 7. Mobile-Optimized View
- Bottom sheet modal variant for mobile viewports
- Touch-friendly swipe-to-dismiss
- Larger touch targets on mobile
- Responsive common tokens grid (fewer columns on small screens)

### 8. Token Categories / Tabs
Filter tokens by category (DeFi, Gaming, Stablecoins, etc.).

- Horizontal scrollable tab bar below search
- Categories from API or configurable via props
- "All" tab as default

### 9. Token Price Display
Show token prices alongside each item.

- Optional `showPrices` in options
- Price data from API or user-provided callback
- Price change indicator (24h %)

### 10. Virtualized List (react-window / react-virtual)
For very large token lists, replace DOM-based infinite scroll with windowed rendering.

- Only render visible items + buffer
- Smoother scrolling performance with 1000+ tokens
- Maintain keyboard navigation compatibility

### 11. Animation & Micro-interactions
- Token selection ripple/pulse effect
- Smooth list item enter/exit animations
- Skeleton-to-content crossfade transition
- Common token chip press animation

### 12. Theming Enhancements
- CSS variables mode (for non-styled-components consumers)
- Dark/light mode auto-detection (`prefers-color-scheme`)
- Runtime theme switching without remount
- Theme transition animations

### 13. Plugin / Extension System
Allow consuming apps to inject custom sections or modify behavior.

- Slot-based API for header/footer sections
- Custom list item renderer prop
- Middleware pattern for token filtering/sorting
- Event hooks (onOpen, onClose, onSearch, onSelect)

### 14. Internationalization (i18n)
- Configurable labels/strings via `labels` option
- RTL layout support
- Number formatting per locale

### 15. Analytics Hooks
Optional callbacks for tracking user behavior.

- `onSearch` — search terms and result counts
- `onSelect` — which tokens are selected most
- `onScroll` — scroll depth tracking
- `onModalOpen` / `onModalClose` — usage frequency
