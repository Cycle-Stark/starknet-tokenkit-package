// Turn Starknet RPC / wallet / starknet.js errors into plain-English messages.
//
// Pure TypeScript, no React, no runtime dependencies. Accepts:
//   - a starknet.js RpcError (reads `baseError.code` / `baseError.data` and
//     `request.params` for the outer calls),
//   - a LibraryError / Error whose message carries the RPC text,
//   - a raw JSON-RPC error (`{ code, message, data }` or `{ error: {...} }`),
//   - a plain string.

import { selectorFromName } from './selector';

export type StarknetErrorKind =
    | 'insufficient_balance'
    | 'insufficient_allowance'
    | 'arithmetic_overflow'
    | 'invalid_signature'
    | 'invalid_nonce'
    | 'insufficient_max_fee'
    | 'insufficient_fee_balance'
    | 'out_of_gas'
    | 'contract_not_found'
    | 'entrypoint_not_found'
    | 'class_hash_not_found'
    | 'class_already_declared'
    | 'compiled_class_hash_mismatch'
    | 'validation_failure'
    | 'account_not_deployed'
    | 'user_rejected'
    | 'permission_denied'
    | 'rate_limited'
    | 'network'
    | 'unknown';

export interface StarknetErrorFrame {
    /** Contract address of this call frame, if known. */
    contract?: string;
    /** Entrypoint selector of this call frame, if known. */
    selector?: string;
    /** Entrypoint name resolved from the selector, if known. */
    entrypoint?: string;
    /** Most specific revert reason found in this frame ('' when none). */
    reason: string;
}

export interface ParsedStarknetError {
    kind: StarknetErrorKind;
    title: string;
    message: string;
    hint?: string;
    /** Whether retrying the same action (possibly after re-estimating) can succeed. */
    retryable: boolean;
    /** JSON-RPC / wallet error code, if one was found. */
    code?: number;
    /** Address of the contract the failure is attributed to. */
    contract?: string;
    /** Token symbol for `contract`, resolved from `opts.tokens`. */
    contractSymbol?: string;
    /** Entrypoint name the failure is attributed to. */
    entrypoint?: string;
    /** Innermost meaningful revert reason, decoded. */
    reason?: string;
    /** Call frames, outermost first. */
    frames: StarknetErrorFrame[];
    /** The original input. */
    raw: unknown;
}

export interface ParseStarknetErrorOptions {
    /** Known tokens, used to name the contract that failed ("ETH", "USDC"...). */
    tokens?: ReadonlyArray<{ address: string; symbol: string }>;
    /** Contract ABI (starknet.js `Abi`), used to name selectors not in the built-in table. */
    abi?: ReadonlyArray<unknown>;
    /**
     * The calls that were sent, when the caller knows them. Used when the error
     * only points at the account's `__execute__`. When omitted, calls are read
     * from the RpcError request params or the error message when present.
     */
    calls?: ReadonlyArray<{ contractAddress: string; entrypoint?: string; selector?: string }>;
}

// ---------------------------------------------------------------------------
// Felt / address helpers
// ---------------------------------------------------------------------------

function normalizeAddress(addr: unknown): string | undefined {
    if (typeof addr !== 'string' && typeof addr !== 'bigint' && typeof addr !== 'number') return undefined;
    try {
        const n = BigInt(addr as string);
        return '0x' + n.toString(16);
    } catch {
        return undefined;
    }
}

/** Decode a felt to a Cairo short string, or undefined if it isn't printable ASCII. */
function decodeShortString(felt: string): string | undefined {
    let n: bigint;
    try {
        n = BigInt(felt);
    } catch {
        return undefined;
    }
    if (n === 0n) return '';
    let hex = n.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    if (hex.length > 62) return undefined;
    let out = '';
    for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.slice(i, i + 2), 16);
        if (code < 0x20 || code > 0x7e) return undefined;
        out += String.fromCharCode(code);
    }
    return out;
}

/** Cairo ByteArray serialization magic used in panic data. */
const BYTE_ARRAY_MAGIC = BigInt('0x46a6158a16a947e5916b2a2ca68501a45e93d7110e81aa2d6438b1c57c879a3');

function decodeByteArrayPanic(felts: string[]): string | undefined {
    try {
        if (felts.length < 4 || BigInt(felts[0]) !== BYTE_ARRAY_MAGIC) return undefined;
        const fullWords = Number(BigInt(felts[1]));
        if (felts.length < 4 + fullWords) return undefined;
        const toBytes = (felt: string, len: number) => {
            let hex = BigInt(felt).toString(16).padStart(len * 2, '0');
            hex = hex.slice(hex.length - len * 2);
            let s = '';
            for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
            return s;
        };
        let out = '';
        for (let i = 0; i < fullWords; i++) out += toBytes(felts[2 + i], 31);
        const pendingLen = Number(BigInt(felts[3 + fullWords]));
        if (pendingLen > 0) out += toBytes(felts[2 + fullWords], pendingLen);
        return out;
    } catch {
        return undefined;
    }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface RpcInfo {
    code?: number;
    rpcMessage?: string;
    data?: unknown;
    text: string;
    params?: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object';
}

function toCode(v: unknown): number | undefined {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^-?\d+$/.test(v)) return Number(v);
    return undefined;
}

function tryJson(s: string): unknown {
    try {
        return JSON.parse(s);
    } catch {
        return undefined;
    }
}

function getRpcInfo(err: unknown): RpcInfo {
    if (typeof err === 'string') return { text: err, ...parseRpcText(err) };
    if (!isObject(err)) return { text: String(err ?? '') };

    const message = typeof err.message === 'string' ? err.message : '';
    const request = isObject(err.request) ? err.request : undefined;
    const params = request?.params;

    // starknet.js RpcError
    if (isObject(err.baseError)) {
        const b = err.baseError;
        return {
            code: toCode(b.code),
            rpcMessage: typeof b.message === 'string' ? b.message : undefined,
            data: b.data,
            text: message || String(b.message ?? ''),
            params: params ?? parseRpcText(message).params,
        };
    }
    // Raw JSON-RPC response `{ jsonrpc, id, error }`
    if (isObject(err.error) && (toCode(err.error.code) !== undefined || typeof err.error.message === 'string')) {
        const e = err.error;
        return {
            code: toCode(e.code),
            rpcMessage: typeof e.message === 'string' ? e.message : undefined,
            data: e.data,
            text: typeof e.message === 'string' ? e.message : message,
        };
    }
    // Raw JSON-RPC error object / wallet error `{ code, message, data }`
    const code = toCode(err.code);
    if (code !== undefined) {
        return { code, rpcMessage: message || undefined, data: err.data, text: message, params };
    }
    // LibraryError / Error with the RPC text in its message
    const fromText = parseRpcText(message);
    if (fromText.code === undefined && typeof err.code === 'string') fromText.rpcMessage = err.code;
    return { text: message || safeStringify(err), ...fromText, params: params ?? fromText.params };
}

function safeStringify(v: unknown): string {
    try {
        return JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? val.toString() : val)) ?? '';
    } catch {
        return String(v);
    }
}

/**
 * Parse starknet.js's RpcError message layout:
 *   RPC: <method> with params <json>\n\n      <code>: <message>: <data json>
 */
function parseRpcText(text: string): Omit<RpcInfo, 'text'> {
    const out: Omit<RpcInfo, 'text'> = {};
    const paramsMatch = /with params ([\s\S]*?)\n\s*\n\s*-?\d+:\s/.exec(text);
    if (paramsMatch) out.params = tryJson(paramsMatch[1]);

    const tail = paramsMatch ? text.slice(paramsMatch.index + 'with params '.length + paramsMatch[1].length) : text;
    const line =
        /(?:^|\n)\s*(-?\d+):\s*([^\n]*)$/.exec(tail.replace(/\s+$/, '')) ??
        /(?:^|\n)\s*(-?\d+):\s*([\s\S]*)$/.exec(tail);
    if (!line) return out;
    out.code = Number(line[1]);
    const rest = line[2];
    // "<message>: <data>" where data is JSON (object / string) or plain text.
    const sep = rest.search(/:\s*[{["]/);
    if (sep >= 0) {
        out.rpcMessage = rest.slice(0, sep).trim();
        const dataText = rest.slice(sep + 1).trim();
        const parsed = tryJson(dataText);
        out.data = parsed !== undefined ? parsed : dataText;
    } else {
        const idx = rest.indexOf(': ');
        out.rpcMessage = (idx >= 0 ? rest.slice(0, idx) : rest).trim();
        if (idx >= 0) out.data = rest.slice(idx + 2).trim();
    }
    return out;
}

interface RawFrame {
    contract?: string;
    selector?: string;
    reasons: string[];
}

/** Decode every revert reason contained in a chunk of error text, in order. */
function decodeReasons(text: string): string[] {
    // Annotated felts: 0x4552... ('ERC20: insufficient balance')
    const annotated: { felt: string; label: string }[] = [];
    const annRe = /(0x[0-9a-fA-F]+)\s*\((?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\)/g;
    let m: RegExpExecArray | null;
    while ((m = annRe.exec(text))) annotated.push({ felt: m[1], label: m[2] ?? m[3] ?? '' });
    if (annotated.length) {
        const ba = decodeByteArrayPanic(annotated.map((a) => a.felt));
        if (ba !== undefined) return [ba];
        return annotated.map((a) => a.label || decodeShortString(a.felt) || (BigInt(a.felt) === 0n ? '' : a.felt));
    }

    // "Failure reason: 0x..." or "Failure reason: (0x..., 0x...)" or "Failure reason: text."
    const fr = /Failure reason:\s*([^\n]*)/.exec(text);
    const errMsgs = [...text.matchAll(/Error message:\s*([^\n]+)/g)].map((x) => x[1].trim());
    const source = fr ? fr[1] : undefined;
    if (source !== undefined) {
        const felts = source.match(/0x[0-9a-fA-F]+/g);
        if (felts) {
            const ba = decodeByteArrayPanic(felts);
            if (ba !== undefined) return [...errMsgs, ba];
            return [...errMsgs, ...felts.map((f) => decodeShortString(f) ?? f)];
        }
        return [...errMsgs, source.replace(/\.\s*$/, '').trim()];
    }
    if (errMsgs.length) return errMsgs;

    // A single bare felt
    const single = /^\s*(0x[0-9a-fA-F]+)\s*$/.exec(text);
    if (single) {
        const d = decodeShortString(single[1]);
        return [d ?? single[1]];
    }

    // Bare felt tuple "(0x..., 0x...)"
    const tuple = /\(\s*(0x[0-9a-fA-F]+(?:\s*,\s*0x[0-9a-fA-F]+)*)\s*\)/.exec(text);
    if (tuple) {
        const felts = tuple[1].split(/\s*,\s*/);
        const ba = decodeByteArrayPanic(felts);
        if (ba !== undefined) return [ba];
        const decoded = felts.map((f) => decodeShortString(f));
        if (decoded.some((d) => d)) return decoded.map((d, i) => d ?? felts[i]);
    }
    return [];
}

/** Split a v0.7-style string trace into frames ("Error in the called contract (...)"). */
function framesFromText(text: string): RawFrame[] {
    const parts = text.split(/Error in (?:the called )?contract\s*\(/);
    if (parts.length <= 1) {
        const reasons = decodeReasons(text);
        return reasons.length ? [{ reasons }] : [];
    }
    const frames: RawFrame[] = [];
    const lead = decodeReasons(parts[0]);
    if (lead.length) frames.push({ reasons: lead });
    for (const part of parts.slice(1)) {
        const header = part.slice(0, part.indexOf(')') + 1);
        const contract =
            /contract address:\s*(0x[0-9a-fA-F]+)/.exec(header)?.[1] ?? /^\s*(0x[0-9a-fA-F]+)\s*\)/.exec(header)?.[1];
        const selector = /selector:\s*(0x[0-9a-fA-F]+)/.exec(header)?.[1];
        frames.push({ contract, selector, reasons: decodeReasons(part.slice(header.length)) });
    }
    return frames;
}

/** Walk RPC 0.8+ nested `execution_error` / `revert_error` trees (or strings). */
function walkExecutionError(node: unknown, frames: RawFrame[], depth = 0): void {
    if (depth > 64 || node == null) return;
    if (typeof node === 'string') {
        frames.push(...framesFromText(node));
        return;
    }
    if (!isObject(node)) return;
    if ('contract_address' in node || 'selector' in node || 'class_hash' in node) {
        const frame: RawFrame = {
            contract: typeof node.contract_address === 'string' ? node.contract_address : undefined,
            selector: typeof node.selector === 'string' ? node.selector : undefined,
            reasons: [],
        };
        frames.push(frame);
        if (typeof node.error === 'string') {
            const inner = framesFromText(node.error);
            // A plain reason string belongs to this frame; a textual trace adds frames.
            if (inner.length === 1 && !inner[0].contract) frame.reasons = inner[0].reasons;
            else frames.push(...inner);
            if (!frame.reasons.length && !inner.length && node.error.trim()) frame.reasons = [node.error.trim()];
        } else {
            walkExecutionError(node.error, frames, depth + 1);
        }
        return;
    }
    if ('execution_error' in node) return walkExecutionError(node.execution_error, frames, depth + 1);
    if ('revert_error' in node) return walkExecutionError(node.revert_error, frames, depth + 1);
    if ('revert_reason' in node) return walkExecutionError(node.revert_reason, frames, depth + 1);
    if ('error' in node) return walkExecutionError(node.error, frames, depth + 1);
}

// ---------------------------------------------------------------------------
// Noise filtering
// ---------------------------------------------------------------------------

const NOISE_RE =
    /^(?:|0x0|ENTRYPOINT_FAILED|argent\/multicall-failed|Option::unwrap failed\.?|Execution failed\.?|multicall-failed|argent\/execute-failed)$/i;

function isNoise(reason: string): boolean {
    return NOISE_RE.test(reason.trim());
}

function bestReason(reasons: string[]): string | undefined {
    const meaningful = reasons.filter((r) => !isNoise(r));
    return meaningful.length ? meaningful[meaningful.length - 1] : undefined;
}

// ---------------------------------------------------------------------------
// Calls (for attributing an `__execute__` failure to the right token)
// ---------------------------------------------------------------------------

interface CallRef {
    to: string;
    selector?: string;
    entrypoint?: string;
}

function findInvokeTx(params: unknown, depth = 0): Record<string, unknown> | undefined {
    if (depth > 6 || !isObject(params)) return undefined;
    if (Array.isArray(params.calldata) && 'sender_address' in params) return params;
    for (const v of Array.isArray(params) ? params : Object.values(params)) {
        const found = findInvokeTx(v, depth + 1);
        if (found) return found;
    }
    return undefined;
}

/** Decode Cairo 1 `__execute__` calldata: [n, (to, selector, len, ...data)*]. */
function decodeExecuteCalldata(calldata: unknown[]): CallRef[] {
    try {
        const felts = calldata.map((c) => BigInt(c as string));
        const n = Number(felts[0]);
        if (!Number.isFinite(n) || n <= 0 || n > 64) return [];
        const calls: CallRef[] = [];
        let i = 1;
        for (let k = 0; k < n; k++) {
            if (i + 2 >= felts.length) return [];
            const len = Number(felts[i + 2]);
            calls.push({ to: '0x' + felts[i].toString(16), selector: '0x' + felts[i + 1].toString(16) });
            i += 3 + len;
        }
        return i === felts.length ? calls : [];
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

interface Ctx {
    code?: number;
    reason: string;
    /** All reason strings + RPC message + raw text, lowercased, for matching. */
    haystack: string;
    symbol?: string;
    entrypoint?: string;
    contractIsToken: boolean;
    contractIsSender: boolean;
}

interface Rule {
    kind: StarknetErrorKind;
    match: (c: Ctx) => boolean;
    title: string;
    message: (c: Ctx) => string;
    hint?: string;
    retryable: boolean;
}

const has = (c: Ctx, re: RegExp) => re.test(c.haystack);

function actionPhrase(entrypoint?: string): string {
    const e = (entrypoint ?? '').toLowerCase();
    if (/transfer/.test(e)) return 'this transfer';
    if (/approve|allowance/.test(e)) return 'this approval';
    if (/swap/.test(e)) return 'this swap';
    if (/deposit|supply|add_liquidity|stake/.test(e)) return 'this deposit';
    if (/withdraw|remove_liquidity|unstake/.test(e)) return 'this withdrawal';
    if (/repay/.test(e)) return 'this repayment';
    return 'this transaction';
}

const TRANSFER_LIKE = /^(transfer|transferFrom|transfer_from|burn|deposit|swap|multi_route_swap|multicall_swap|supply|repay|stake|add_liquidity)$/;

const RULES: Rule[] = [
    {
        kind: 'user_rejected',
        match: (c) => c.code === 4001 || c.code === 113 || has(c, /user (?:rejected|refused|denied|aborted|cancel+ed)|rejected by (?:the )?user|user_refused_op|user abort/),
        title: 'Request rejected',
        message: () => 'You rejected the request in your wallet.',
        retryable: true,
    },
    {
        kind: 'permission_denied',
        match: (c) => c.code === 4100 || has(c, /permission denied|not authorized by the user|unauthorized origin/),
        title: 'Permission denied',
        message: () => 'This site is not allowed to use your wallet for this request.',
        hint: 'Connect the wallet to this site and try again.',
        retryable: false,
    },
    {
        kind: 'insufficient_allowance',
        match: (c) => /insufficient allowance|exceeds allowance|allowance (?:too low|exceeded)/i.test(c.reason) || has(c, /insufficient allowance|transfer amount exceeds allowance/),
        title: 'Allowance too low',
        message: (c) =>
            `The contract is not allowed to spend enough ${c.symbol ?? 'of this token'} for ${actionPhrase(c.entrypoint)}.`,
        hint: 'Approve a larger amount and try again.',
        retryable: false,
    },
    {
        kind: 'insufficient_balance',
        match: (c) =>
            /insufficient balance|transfer amount exceeds balance|burn amount exceeds balance|not enough balance/i.test(c.reason) ||
            (/u256_sub overflow/i.test(c.reason) && (c.contractIsToken || TRANSFER_LIKE.test(c.entrypoint ?? ''))),
        title: 'Insufficient balance',
        message: (c) => `You don't have enough ${c.symbol ?? 'tokens'} for ${actionPhrase(c.entrypoint)}.`,
        hint: 'Lower the amount or add funds, then try again.',
        retryable: false,
    },
    {
        kind: 'arithmetic_overflow',
        match: (c) => /u(?:8|16|32|64|128|256)_(?:sub|add|mul) overflow/i.test(c.reason),
        title: 'Amount out of range',
        message: () => 'A calculation in the contract went out of range. This usually means an amount is larger than what is available.',
        hint: 'Try a smaller amount.',
        retryable: false,
    },
    {
        kind: 'invalid_signature',
        match: (c) => has(c, /invalid[ _-]?(?:owner[ _-]?|guardian[ _-]?)?sig(?:nature)?|signature (?:is )?invalid|is_valid_signature|invalid-(?:owner|guardian)-sig|wrong signature/),
        title: 'Invalid signature',
        message: () => 'The account rejected the transaction signature.',
        hint: 'Make sure the right account and signer are selected, then sign again.',
        retryable: false,
    },
    {
        kind: 'invalid_nonce',
        match: (c) => c.code === 52 || has(c, /invalid (?:transaction )?nonce|nonce (?:is )?(?:too (?:low|high)|invalid)|invalidnonce|account nonce/),
        title: 'Transaction out of order',
        message: () => 'The account nonce changed, usually because another transaction from this account went through first.',
        hint: 'Wait a moment and try again.',
        retryable: true,
    },
    {
        kind: 'insufficient_fee_balance',
        match: (c) => c.code === 54 || has(c, /insufficient account balance|exceeds? (?:the )?(?:account )?balance.*fee|fee.*exceeds? balance|resources bounds.*exceed balance|not enough .* to pay (?:the )?fee/),
        title: 'Not enough for fees',
        message: (c) => `Your account doesn't have enough ${c.symbol && c.contractIsToken ? c.symbol : 'STRK or ETH'} to pay the network fee.`,
        hint: 'Add funds for gas, then try again.',
        retryable: false,
    },
    {
        kind: 'insufficient_max_fee',
        match: (c) => c.code === 53 || has(c, /insufficient max fee|max fee is too low|insufficient resources|max_fee .* too low|resources bounds .* (?:too low|insufficient)|actual fee exceeded max fee|max (?:l[12] )?(?:gas )?(?:amount|price) .* (?:lower|less) than/),
        title: 'Fee too low',
        message: () => 'The fee limit set for this transaction is lower than what the network needs right now.',
        hint: 'Estimate the fee again and resubmit.',
        retryable: true,
    },
    {
        kind: 'out_of_gas',
        match: (c) => has(c, /out of gas|ran out of gas|run out of resources|insufficient gas|gas limit exceeded/),
        title: 'Out of gas',
        message: () => 'The transaction ran out of gas before it finished.',
        hint: 'Estimate the fee again and resubmit.',
        retryable: true,
    },
    {
        kind: 'account_not_deployed',
        match: (c) =>
            has(c, /account (?:is )?not deployed|account_not_deployed|undeployed account/) ||
            ((c.code === 20 || has(c, /contract not found|is not deployed|uninitialized contract/)) && c.contractIsSender),
        title: 'Account not deployed',
        message: () => 'This account has not been deployed on Starknet yet.',
        hint: 'Deploy the account first (it usually happens with your first transaction), then try again.',
        retryable: false,
    },
    {
        kind: 'class_already_declared',
        match: (c) => c.code === 51 || has(c, /class (?:hash )?.*already declared|classalreadydeclared/),
        title: 'Class already declared',
        message: () => 'This contract class is already declared on the network.',
        hint: 'Skip the declare step and deploy using the existing class hash.',
        retryable: false,
    },
    {
        kind: 'compiled_class_hash_mismatch',
        match: (c) => c.code === 60 || has(c, /compiled class hash mismatch|mismatch.*compiled class hash/),
        title: 'Compiled class hash mismatch',
        message: () => 'The compiled class hash does not match the one the network computed.',
        hint: 'Recompile with the compiler version the network expects and declare again.',
        retryable: false,
    },
    {
        kind: 'class_hash_not_found',
        match: (c) => c.code === 28 || has(c, /class hash not found|class with hash .* is not declared|undeclaredclasshash|class .* not declared/),
        title: 'Class not declared',
        message: () => 'The contract class hash was not found on this network.',
        hint: 'Check you are on the right network, or declare the class first.',
        retryable: false,
    },
    {
        kind: 'contract_not_found',
        match: (c) => c.code === 20 || has(c, /contract not found|requested contract address .* is not deployed|is not deployed|uninitialized contract/),
        title: 'Contract not found',
        message: () => 'The contract this request calls does not exist on this network.',
        hint: 'Check the address and that you are on the right network.',
        retryable: false,
    },
    {
        kind: 'entrypoint_not_found',
        match: (c) => c.code === 21 || has(c, /entrypoint_not_found|entry ?point .*not found|requested entrypoint does not exist/),
        title: 'Function not found',
        message: (c) => `The contract does not have the function${c.entrypoint ? ` "${c.entrypoint}"` : ''} this request calls.`,
        retryable: false,
    },
    {
        kind: 'validation_failure',
        match: (c) => c.code === 55 || has(c, /validation failure|validate (?:has )?failed|__validate__ .*failed/),
        title: 'Validation failed',
        message: (c) => `The account rejected this transaction during validation${c.reason ? `: ${c.reason}` : ''}.`,
        hint: 'Check the account, signer and fee settings, then try again.',
        retryable: false,
    },
    {
        kind: 'rate_limited',
        match: (c) => c.code === 429 || has(c, /rate limit|too many requests|\b429\b|request limit/),
        title: 'Too many requests',
        message: () => 'The network node is rate limiting requests right now.',
        hint: 'Wait a few seconds and try again.',
        retryable: true,
    },
    {
        kind: 'network',
        match: (c) =>
            has(c, /failed to fetch|fetch failed|network ?error|networkerror|econnrefused|econnreset|etimedout|enotfound|socket hang up|timed? ?out|\b50[234]\b|bad gateway|service unavailable|load failed/),
        title: 'Network problem',
        message: () => 'Could not reach the Starknet node.',
        hint: 'Check your connection and try again.',
        retryable: true,
    },
];

function capitalize(s: string): string {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ACCOUNT_ENTRYPOINTS = /^(__execute__|__validate__|__validate_declare__|__validate_deploy__|execute_from_outside|execute_from_outside_v2)$/;

export function parseStarknetError(err: unknown, opts: ParseStarknetErrorOptions = {}): ParsedStarknetError {
    const info = getRpcInfo(err);
    const abiMap = abiSelectors(opts.abi);
    const nameOf = (selector?: string) => {
        const s = normalizeAddress(selector);
        return s ? abiMap[s] ?? BUILTIN_SELECTORS[s] : undefined;
    };
    const tokenMap = new Map<string, string>();
    for (const t of opts.tokens ?? []) {
        const a = normalizeAddress(t.address);
        if (a) tokenMap.set(a, t.symbol);
    }

    // 1. Extract frames (structured data first, regex over text as fallback).
    const raw: RawFrame[] = [];
    if (info.data !== undefined && info.data !== null) walkExecutionError(info.data, raw);
    if (!raw.some((f) => f.reasons.length)) {
        let text = info.text;
        // Drop "with params {...}" so calldata felts are not read as reasons.
        text = text.replace(/with params [\s\S]*?\n\s*\n/, '\n');
        const fromText = framesFromText(text);
        if (fromText.some((f) => f.reasons.length)) raw.push(...fromText);
    }

    const frames: StarknetErrorFrame[] = raw.map((f) => ({
        contract: f.contract,
        selector: f.selector,
        entrypoint: nameOf(f.selector),
        reason: bestReason(f.reasons) ?? f.reasons.find((r) => r.trim() && r !== '0x0') ?? '',
    }));

    // 2-3. Pick the innermost meaningful reason.
    let reason: string | undefined;
    let reasonFrame: StarknetErrorFrame | undefined;
    for (let i = raw.length - 1; i >= 0; i--) {
        const r = bestReason(raw[i].reasons);
        if (r !== undefined) {
            reason = r;
            reasonFrame = frames[i];
            break;
        }
    }
    if (reason === undefined) {
        for (let i = raw.length - 1; i >= 0 && reason === undefined; i--) {
            const r = raw[i].reasons.find((x) => x.trim() && x !== '0x0');
            if (r) {
                reason = r;
                reasonFrame = frames[i];
            }
        }
    }
    if (reason === undefined && typeof err === 'string' && !/^RPC:/.test(err)) reason = err.trim() || undefined;
    if (reason === undefined && info.data && typeof info.data === 'string') reason = info.data;

    // 5. Context: which contract / entrypoint the failure is about.
    const innermost = [...frames].reverse().find((f) => f.contract) ?? reasonFrame;
    let contract = innermost?.contract;
    let entrypoint = innermost?.entrypoint;

    const invoke = findInvokeTx(info.params);
    const sender = normalizeAddress(invoke?.sender_address);
    const calls: CallRef[] = opts.calls
        ? opts.calls.map((c) => ({
              to: c.contractAddress,
              selector: c.selector,
              entrypoint: c.entrypoint ?? nameOf(c.selector),
          }))
        : invoke
          ? decodeExecuteCalldata(invoke.calldata as unknown[]).map((c) => ({ ...c, entrypoint: nameOf(c.selector) }))
          : [];

    const pointsAtAccount =
        !contract || ACCOUNT_ENTRYPOINTS.test(entrypoint ?? '') || (sender !== undefined && normalizeAddress(contract) === sender);
    if (pointsAtAccount && calls.length) {
        const tokenCall = calls.find((c) => tokenMap.has(normalizeAddress(c.to) ?? ''));
        const pick = tokenCall ?? (calls.length === 1 ? calls[0] : undefined);
        if (pick) {
            contract = pick.to;
            entrypoint = pick.entrypoint ?? nameOf(pick.selector);
        }
    }

    const normContract = normalizeAddress(contract);
    const contractSymbol = normContract ? tokenMap.get(normContract) : undefined;

    // Code: prefer the RPC code; fall back to a wallet code.
    const code = info.code;

    const haystack = [reason ?? '', ...raw.flatMap((f) => f.reasons), info.rpcMessage ?? '', typeof info.data === 'string' ? info.data : '', info.text.replace(/with params [\s\S]*?\n\s*\n/, '\n')]
        .join('\n')
        .toLowerCase();

    const ctx: Ctx = {
        code,
        reason: reason ?? '',
        haystack,
        symbol: contractSymbol,
        entrypoint,
        contractIsToken: !!contractSymbol,
        contractIsSender: sender !== undefined && normContract === sender,
    };
    // For contract-not-found on an estimate where no frame contract is known,
    // the missing contract is usually the account itself.
    if (!innermost?.contract && sender && (code === 20 || /is not deployed/i.test(haystack))) {
        const addr = /(0x[0-9a-f]{50,64})[^\n]*is not deployed|contract address (0x[0-9a-f]+)/i.exec(haystack);
        const missing = normalizeAddress(addr?.[1] ?? addr?.[2]);
        if (!missing || missing === sender) ctx.contractIsSender = true;
    }

    // 4. Classify.
    const rule = RULES.find((r) => r.match(ctx));
    const base = {
        code,
        contract,
        contractSymbol,
        entrypoint,
        reason,
        frames,
        raw: err,
    };
    if (rule) {
        return {
            kind: rule.kind,
            title: rule.title,
            message: rule.message(ctx),
            ...(rule.hint ? { hint: rule.hint } : {}),
            retryable: rule.retryable,
            ...base,
        };
    }

    const shown = reason ?? info.rpcMessage;
    return {
        kind: 'unknown',
        title: 'Transaction failed',
        message: shown
            ? `The ${contractSymbol ? `${contractSymbol} contract` : 'contract'} returned an error: ${capitalize(shown.replace(/\.\s*$/, ''))}.`
            : 'Something went wrong while sending this request.',
        retryable: false,
        ...base,
    };
}

/** One-line, plain-English description of a Starknet error. */
export function formatStarknetError(err: unknown, opts?: ParseStarknetErrorOptions): string {
    const p = parseStarknetError(err, opts);
    return p.hint ? `${p.message} ${p.hint}` : p.message;
}
