// Selector to entrypoint-name lookup: a built-in table of common entrypoints
// plus names derived from a caller-supplied ABI.

import { normalizeAddress } from './felts';
import { selectorFromName } from './selector';

const COMMON_ENTRYPOINTS = [
    'transfer', 'transferFrom', 'transfer_from', 'approve', 'increaseAllowance', 'increase_allowance',
    'balanceOf', 'balance_of', 'mint', 'burn', 'safe_transfer_from', 'safeTransferFrom',
    'set_approval_for_all', 'setApprovalForAll', '__execute__', '__validate__', '__validate_declare__',
    '__validate_deploy__', 'execute_from_outside', 'execute_from_outside_v2', 'deploy_contract',
    'constructor', 'swap', 'multi_route_swap', 'multicall_swap', 'deposit', 'withdraw', 'stake',
    'unstake', 'claim', 'claim_rewards', 'add_liquidity', 'remove_liquidity', 'supply', 'borrow',
    'repay', 'flash_loan',
];

// Precomputed with starknet.js `hash.getSelectorFromName` (verified in tests).
const BUILTIN_SELECTORS: Record<string, string> = {
    '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e': 'transfer',
    '0x41b033f4a31df8067c24d1e9b550a2ce75fd4a29e1147af9752174f0e6cb20': 'transferFrom',
    '0x3704ffe8fba161be0e994951751a5033b1462b918ff785c0a636be718dfdb68': 'transfer_from',
    '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c': 'approve',
    '0x16cc063b8338363cf388ce7fe1df408bf10f16cd51635d392e21d852fafb683': 'increaseAllowance',
    '0x1d13ab0a76d7407b1d5faccd4b3d8a9efe42f3d3c21766431d4fafb30f45bd4': 'increase_allowance',
    '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e': 'balanceOf',
    '0x35a73cd311a05d46deda634c5ee045db92f811b4e74bca4437fcb5302b7af33': 'balance_of',
    '0x2f0b3c5710379609eb5495f1ecd348cb28167711b73609fe565a72734550354': 'mint',
    '0x3e8cfd4725c1e28fa4a6e3e468b4fcf75367166b850ac5f04e33ec843e82c1': 'burn',
    '0x16f0218b33b5cf273196787d7cf139a9ad13d58e6674dcdce722b3bf8389863': 'safe_transfer_from',
    '0x19d59d013d4aa1a8b1ce4c8299086f070733b453c02d0dc46e735edc04d6444': 'safeTransferFrom',
    '0xd86ca3d41635e20c180181046b11abcf19e1bdef3dcaa4c180300ccca1813f': 'set_approval_for_all',
    '0x2d4c8ea4c8fb9f571d1f6f9b7692fff8e5ceaf73b1df98e7da8c1109b39ae9a': 'setApprovalForAll',
    '0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad': '__execute__',
    '0x162da33a4585851fe8d3af3c2a9c60b557814e221e0d4f30ff0b2189d9c7775': '__validate__',
    '0x289da278a8dc833409cabfdad1581e8e7d40e42dcaed693fa4008dcdb4963b3': '__validate_declare__',
    '0x36fcbf06cd96843058359e1a75928beacfac10727dab22a3972f0af8aa92895': '__validate_deploy__',
    '0x7ec457cd7ed1630225a8328f826a29a327b19486f6b2882b4176545ebdbe3d': 'execute_from_outside',
    '0x34cc13b274446654ca3233ed2c1620d4c5d1d32fd20b47146a3371064bdc57d': 'execute_from_outside_v2',
    '0x2730079d734ee55315f4f141eaed376bddd8c2133523d223a344c5604e0f7f8': 'deploy_contract',
    '0x28ffe4ff0f226a9107253e17a904099aa4f63a02a5621de0576e5aa71bc5194': 'constructor',
    '0x15543c3708653cda9d418b4ccd3be11368e40636c10c44b18cfe756b6d88b29': 'swap',
    '0x1171593aa5bdadda4d6b0efde6cc94ee7649c3163d5efeb19da6c16d63a2a63': 'multi_route_swap',
    '0x30b66c58189e367bd23f90ef1c5d2b2835f81703e64706e726724ab1ec4180d': 'multicall_swap',
    '0xc73f681176fc7b3f9693986fd7b14581e8d540519e27400e88b8713932be01': 'deposit',
    '0x15511cc3694f64379908437d6d64458dc76d02482052bfb8a5b33a72c054c77': 'withdraw',
    '0x3a04795accb4b73d12f13b05a1e0e240cefeb9a89d008676730867a819d2f79': 'stake',
    '0x23e3dfdfce465cb27b5e8c896aede30a96778c0a4ff3c8e892d8dc27583e22c': 'unstake',
    '0xb758361d5e84380ef1e632f89d8e76a8677dbc3f4b93a4f9d75d2a6048f312': 'claim',
    '0x89c7b1cc4866e9e58d867cb66844bcc9c17cfdabb8ab640b05d2bc53efc556': 'claim_rewards',
    '0x2cfb12ff9e08412ec5009c65ea06e727119ad948d25c8a8cc2c86fec4adee70': 'add_liquidity',
    '0x2e875d1c86df033547c5c7839d8b6e3641de29ee1f708bbce99743b34272ada': 'remove_liquidity',
    '0x308cfbb7d2d38db3a215f9728501ac69445a6afbee328cdeae4e23db54b850a': 'supply',
    '0x3943907ef0ef6f9d2e2408b05e520a66daaf74293dbf665e5a20b117676170e': 'borrow',
    '0xad257770e86a03742ebe0a615fb19503d9c891d118daa82163867444c08680': 'repay',
    '0x9a5cfe84c6a8cc2b56f00eaee8d16213efe35a1f5a48d6764c75987c38dabe': 'flash_loan',
};

/** Names in the built-in selector table (exported for tests). */
export const BUILTIN_ENTRYPOINT_NAMES: readonly string[] = COMMON_ENTRYPOINTS;
/** Built-in selector to entrypoint map (exported for tests). */
export const BUILTIN_SELECTOR_TABLE: Readonly<Record<string, string>> = BUILTIN_SELECTORS;

const abiCache = /* @__PURE__ */ new WeakMap<object, Record<string, string>>();

function abiSelectors(abi: ReadonlyArray<unknown> | undefined): Record<string, string> {
    if (!abi) return {};
    const cached = abiCache.get(abi);
    if (cached) return cached;
    const map: Record<string, string> = {};
    const visit = (entries: ReadonlyArray<unknown>) => {
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            const e = entry as { type?: string; name?: string; items?: unknown[] };
            if (Array.isArray(e.items)) visit(e.items);
            if ((e.type === 'function' || e.type === 'l1_handler' || e.type === 'constructor') && typeof e.name === 'string') {
                map[selectorFromName(e.name)] = e.name;
            }
        }
    };
    visit(abi);
    abiCache.set(abi, map);
    return map;
}

export function makeEntrypointResolver(abi: ReadonlyArray<unknown> | undefined): (selector?: string) => string | undefined {
    const abiMap = abiSelectors(abi);
    return (selector) => {
        const s = normalizeAddress(selector);
        return s ? abiMap[s] ?? BUILTIN_SELECTORS[s] : undefined;
    };
}
