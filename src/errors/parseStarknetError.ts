// Turn Starknet RPC / wallet / starknet.js errors into plain-English messages
// plus structured flags, without over-claiming.
//
// Pure TypeScript, no React, no runtime dependencies. Accepts:
//   - a starknet.js RpcError (reads `baseError.code` / `baseError.data` and
//     `request.params` for the outer calls),
//   - a LibraryError / Error whose message carries the RPC text,
//   - a raw JSON-RPC error (`{ code, message, data }` or `{ error: {...} }`),
//   - a plain string.

import {
    CODE_RULES,
    PANIC_KINDS,
    RETRYABLE,
    TITLES,
    actionPhrase,
    leadFor,
    matchReason,
    type ReasonRule,
    type StarknetErrorKind,
} from './classify';
export { StarknetErrors, STARKNET_ERROR_KINDS } from './classify';
import { makeEntrypointResolver } from './entrypoints';
import {
    decodeExecuteCalldata,
    findInvokeTx,
    framesFromText,
    getRpcInfo,
    stripParams,
    walkExecutionError,
    type CallRef,
    type RawFrame,
} from './extract';
import { normalizeAddress, shortAddress } from './felts';

export type { StarknetErrorKind } from './classify';
export { BUILTIN_ENTRYPOINT_NAMES, BUILTIN_SELECTOR_TABLE } from './entrypoints';

export type StarknetErrorConfidence = 'certain' | 'likely' | 'unknown';

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
    /** Primary classification. Compare with `StarknetErrors.*`. */
    kind: StarknetErrorKind;
    /**
     * Every kind detected, primary first. Several can apply (a sub-overflow on a
     * token transfer is both `arithmetic_overflow` and `insufficient_balance`).
     * Compare with `StarknetErrors.*`: `errors.includes(StarknetErrors.CONTRACT_NOT_FOUND)`.
     */
    errors: StarknetErrorKind[];
    title: string;
    /** Plain-English message. Names the failing function and contract when known. */
    message: string;
    hint?: string;
    /** How sure the classification is. 'likely' means inferred, 'unknown' means not interpreted. */
    confidence: StarknetErrorConfidence;
    /** Whether retrying (possibly after re-quoting or re-estimating) can succeed. */
    retryable: boolean;

    // Flags: several can be true at once.
    isInsufficientBalance: boolean;
    isInsufficientAllowance: boolean;
    /** Max fee too low, not enough balance for fees, or the account rejected the fee. */
    isInsufficientFee: boolean;
    isSlippage: boolean;
    isSignature: boolean;
    isNonce: boolean;
    isUserRejected: boolean;
    /** Wallet permission denied (4100) or a contract access-control revert. */
    isPermissionDenied: boolean;
    /** Network or rate-limit failure talking to the node. */
    isNetwork: boolean;
    /** The innermost reason is a Cairo core panic (overflow, unwrap, division by zero, out of bounds). */
    isContractPanic: boolean;
    /** A contract reverted during execution or validation. */
    isContractRevert: boolean;

    /** JSON-RPC / wallet error code, if one was found. */
    code?: number;
    /** Contract whose function failed (after resolving an account multicall to the call that failed). */
    failingContract?: string;
    /** Function that failed. */
    failingEntrypoint?: string;
    /** Token symbol for `failingContract`, resolved from `opts.tokens`. */
    contractSymbol?: string;
    /** Innermost meaningful revert reason, raw. */
    reason?: string;
    /** Every meaningful revert reason across frames, outermost first, deduplicated. */
    reasons: string[];
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
    /**
     * The user's account address. A "contract not found" on this address means
     * the account itself is not deployed yet, reported as `account_not_deployed`.
     */
    account?: string;
}

/** Placeholder text some nodes and libraries put where error data would be. */
const EMPTY_DATA_RE = /^(?:undefined|null|\{\}|\[\]|""|'')$/i;

/** The contract a node-level read was about (getClassAt, getNonce, call...). */
function contractFromParams(params: unknown): string | undefined {
    if (!params || typeof params !== 'object') return undefined;
    const p = params as Record<string, unknown>;
    const direct = p.contract_address;
    if (typeof direct === 'string') return direct;
    const req = p.request;
    if (req && typeof req === 'object' && typeof (req as Record<string, unknown>).contract_address === 'string') {
        return (req as Record<string, unknown>).contract_address as string;
    }
    return undefined;
}

// Generic wrappers that never explain a failure on their own.
const NOISE_RE =
    /^(?:|0x0|ENTRYPOINT_FAILED|argent\/multicall-failed|Execution failed\.?|multicall-failed|argent\/execute-failed|CALL_FAILED)$/i;
// Weak reasons: real, but only shown when nothing more specific exists.
const WEAK_RE = /^(?:Option::unwrap failed\.?|Result::unwrap failed\.?)$/i;

const isNoise = (r: string) => NOISE_RE.test(r.trim());
const isWeak = (r: string) => WEAK_RE.test(r.trim());

/** Most specific reason in a frame: last strong reason, else last weak one. */
function bestReason(reasons: string[]): string | undefined {
    const strong = reasons.filter((r) => !isNoise(r) && !isWeak(r));
    if (strong.length) return strong[strong.length - 1];
    const weak = reasons.filter((r) => isWeak(r));
    return weak.length ? weak[weak.length - 1] : undefined;
}

const ACCOUNT_ENTRYPOINTS = /^(__execute__|__validate__|__validate_declare__|__validate_deploy__|execute_from_outside|execute_from_outside_v2)$/;
const TOKEN_DEBIT_ENTRYPOINTS = /^(transfer|transferFrom|transfer_from|burn)$/;
const TOKEN_ALLOWANCE_ENTRYPOINTS = /^(transferFrom|transfer_from)$/;

function capitalize(s: string): string {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function callDescription(entrypoint?: string, target?: string): string {
    if (entrypoint && target) return `The call to ${entrypoint} on ${target}`;
    if (entrypoint) return `The call to ${entrypoint}`;
    if (target) return `A call to ${target}`;
    return 'The transaction';
}

const trimDot = (s: string) => s.replace(/\.\s*$/, '');

export function parseStarknetError(err: unknown, opts: ParseStarknetErrorOptions = {}): ParsedStarknetError {
    const info = getRpcInfo(err);
    const nameOf = makeEntrypointResolver(opts.abi);
    const tokenMap = new Map<string, string>();
    for (const t of opts.tokens ?? []) {
        const a = normalizeAddress(t.address);
        if (a) tokenMap.set(a, t.symbol);
    }

    // 1. Extract frames: structured data first, regex over the message text as fallback.
    const raw: RawFrame[] = [];
    if (info.data !== undefined && info.data !== null) walkExecutionError(info.data, raw);
    if (!raw.some((f) => f.reasons.length)) {
        const fromText = framesFromText(stripParams(info.text));
        if (fromText.some((f) => f.reasons.length)) raw.push(...fromText);
    }

    const frames: StarknetErrorFrame[] = raw.map((f) => ({
        contract: f.contract,
        selector: f.selector,
        entrypoint: nameOf(f.selector),
        reason: bestReason(f.reasons) ?? '',
    }));

    // 2-3. Innermost meaningful reason, and all meaningful reasons.
    let reasonIdx = -1;
    for (let i = raw.length - 1; i >= 0; i--) {
        if (bestReason(raw[i].reasons) !== undefined) {
            reasonIdx = i;
            break;
        }
    }
    let reason = reasonIdx >= 0 ? bestReason(raw[reasonIdx].reasons) : undefined;
    const reasons: string[] = [];
    for (const f of raw) for (const r of f.reasons) if (!isNoise(r) && !reasons.includes(r)) reasons.push(r);
    const isContractRevert = reasons.length > 0;
    if (reason === undefined && typeof err === 'string' && !/^RPC:/.test(err) && err.trim()) reason = err.trim();
    if (reason === undefined && typeof info.data === 'string' && info.data.trim() && !EMPTY_DATA_RE.test(info.data.trim())) reason = info.data.trim();

    // 5. Which contract / function failed.
    const failingFrame = reasonIdx >= 0 ? frames[reasonIdx] : [...frames].reverse().find((f) => f.contract);
    let failingContract = failingFrame?.contract;
    let failingEntrypoint = failingFrame?.entrypoint;

    const invoke = findInvokeTx(info.params);
    const sender = normalizeAddress(invoke?.sender_address);
    const calls: CallRef[] = opts.calls
        ? opts.calls.map((c) => ({ to: c.contractAddress, selector: c.selector, entrypoint: c.entrypoint ?? nameOf(c.selector) }))
        : invoke
          ? decodeExecuteCalldata(invoke.calldata as unknown[]).map((c) => ({ ...c, entrypoint: nameOf(c.selector) }))
          : [];

    const pointsAtAccount =
        !failingContract ||
        ACCOUNT_ENTRYPOINTS.test(failingEntrypoint ?? '') ||
        (sender !== undefined && normalizeAddress(failingContract) === sender);
    if (pointsAtAccount && calls.length) {
        const callIndex = reasonIdx >= 0 ? raw[reasonIdx].callIndex : raw.find((f) => f.callIndex !== undefined)?.callIndex;
        const pick =
            (callIndex !== undefined ? calls[callIndex] : undefined) ??
            (calls.length === 1 ? calls[0] : undefined) ??
            calls.find((c) => tokenMap.has(normalizeAddress(c.to) ?? ''));
        if (pick) {
            failingContract = pick.to;
            failingEntrypoint = pick.entrypoint ?? nameOf(pick.selector);
        }
    }

    const normContract = normalizeAddress(failingContract);
    const contractSymbol = normContract ? tokenMap.get(normContract) : undefined;
    const target = contractSymbol ?? (failingContract ? shortAddress(failingContract) : undefined);
    const callDesc = callDescription(failingEntrypoint, target);

    // 4. Classify.
    const code = info.code;
    const haystack = [info.rpcMessage ?? '', typeof info.data === 'string' ? info.data : '', stripParams(info.text)]
        .join('\n')
        .toLowerCase();

    const reasonMatches: { reason: string; rule: ReasonRule }[] = [];
    for (const r of reasons) {
        const rule = matchReason(r);
        if (rule) reasonMatches.push({ reason: r, rule });
    }
    const innermostMatch = reason !== undefined ? matchReason(reason) : undefined;

    let kind: StarknetErrorKind = 'unknown';
    let confidence: StarknetErrorConfidence = 'unknown';
    let message = '';
    let hint: string | undefined;
    const kinds = new Set<StarknetErrorKind>();
    for (const m of reasonMatches) kinds.add(m.rule.kind);

    const codeRule = code !== undefined ? CODE_RULES.find((r) => r.codes.includes(code)) : undefined;
    const reasonCarryingCode = code === undefined || code === 40 || code === 41 || code === 55;
    const ctx = { symbol: contractSymbol, entrypoint: failingEntrypoint, reason };

    const withCall = (lead: string) => {
        if (!reason) return lead;
        return `${lead} ${callDesc} failed with "${trimDot(reason)}".`;
    };

    if (codeRule && !reasonCarryingCode) {
        // Definitive RPC / wallet code.
        kind = codeRule.kind;
        confidence = 'certain';
    } else if (innermostMatch || reasonMatches.length) {
        const primary = innermostMatch ?? reasonMatches[0].rule;
        kind = primary.kind;
        confidence = 'certain';
    } else if (codeRule) {
        kind = codeRule.kind; // 55 without a recognised reason
        confidence = 'certain';
    } else {
        const textRule = CODE_RULES.find((r) => r.re?.test(haystack));
        if (textRule) {
            kind = textRule.kind;
            confidence = code !== undefined && textRule.codes.includes(code) ? 'certain' : 'likely';
        } else if (isContractRevert) {
            kind = 'contract_error';
        }
    }

    // Account not deployed: contract-not-found pointing at the sender or the user's account.
    let missingContract: string | undefined;
    if (kind === 'contract_not_found' || /is not deployed/i.test(haystack)) {
        const frameContract = normalizeAddress(failingFrame?.contract);
        const named = /contract address (0x[0-9a-f]+)/i.exec(haystack)?.[1] ?? /(0x[0-9a-f]{40,64})[^\n]*is not deployed/i.exec(haystack)?.[1];
        const missing = frameContract ?? normalizeAddress(named) ?? normalizeAddress(contractFromParams(info.params));
        missingContract = missing;
        const account = normalizeAddress(opts.account);
        const isAccount = (sender && (!missing || missing === sender)) || (account !== undefined && missing === account);
        if (/account (?:is )?not deployed|undeployed account/.test(haystack) || isAccount) {
            if (kind === 'contract_not_found' || kind === 'unknown') kind = 'account_not_deployed';
        }
        if (!failingContract && missing) failingContract = missing;
    }
    kinds.add(kind);

    // Never over-claim: a sub-overflow is an arithmetic panic in the failing function.
    // Only on a known token's transfer / transfer_from / burn is "not enough balance" likely.
    const subOverflow = reason !== undefined && /\b[ui](?:8|16|32|64|128|256)_sub Overflow\b/i.test(reason);
    let inferredBalance = false;
    let inferredAllowance = false;
    if (kind === 'arithmetic_overflow' && subOverflow && contractSymbol && TOKEN_DEBIT_ENTRYPOINTS.test(failingEntrypoint ?? '')) {
        inferredBalance = true;
        inferredAllowance = TOKEN_ALLOWANCE_ENTRYPOINTS.test(failingEntrypoint ?? '');
    }

    // Message.
    const panicWhat = innermostMatch?.what ?? reasonMatches.find((m) => m.rule.kind === kind)?.rule.what;
    if (inferredBalance) {
        kind = 'insufficient_balance';
        confidence = 'likely';
        kinds.add('insufficient_balance');
        if (inferredAllowance) kinds.add('insufficient_allowance');
        const why = inferredAllowance
            ? `This usually means your ${contractSymbol} balance or the allowance is too low for ${actionPhrase(failingEntrypoint)}.`
            : `This usually means you don't have enough ${contractSymbol} for ${actionPhrase(failingEntrypoint)}.`;
        message = `${callDesc} failed: ${panicWhat ?? 'a number went below zero'} (${trimDot(reason!)}). ${why}`;
        hint = 'Lower the amount or add funds, then try again.';
    } else if (PANIC_KINDS.has(kind) && reason) {
        message = `${callDesc} failed: ${panicWhat ?? 'the contract panicked'} (${trimDot(reason)}).`;
    } else if (kind === 'contract_error') {
        message = `${callDesc} failed: ${capitalize(trimDot(reason!))}.`;
    } else if (kind === 'unknown') {
        const shown = reason ?? info.rpcMessage;
        message = shown ? `${callDesc} failed: ${capitalize(trimDot(shown))}.` : 'Something went wrong while sending this request.';
    } else {
        const l = leadFor(kind, ctx);
        hint = l.hint;
        if (kind === 'contract_not_found' && missingContract) {
            const name = tokenMap.get(missingContract) ?? shortAddress(missingContract);
            l.lead = `The contract ${name} does not exist on this network.`;
        }
        const fromContract = isContractRevert && (reasonMatches.some((m) => m.rule.kind === kind) || kind === 'validation_failure');
        message = fromContract ? withCall(l.lead) : l.lead;
    }

    const errors: StarknetErrorKind[] = [kind, ...[...kinds].filter((k) => k !== kind)];

    return {
        kind,
        errors,
        title: TITLES[kind],
        message,
        ...(hint ? { hint } : {}),
        confidence,
        retryable: RETRYABLE.has(kind),
        isInsufficientBalance: kinds.has('insufficient_balance'),
        isInsufficientAllowance: kinds.has('insufficient_allowance'),
        isInsufficientFee: kinds.has('insufficient_max_fee') || kinds.has('insufficient_fee_balance') || kinds.has('fee_rejected'),
        isSlippage: kinds.has('slippage'),
        isSignature: kinds.has('invalid_signature'),
        isNonce: kinds.has('invalid_nonce'),
        isUserRejected: kinds.has('user_rejected'),
        isPermissionDenied: kinds.has('permission_denied') || kinds.has('unauthorized_caller'),
        isNetwork: kinds.has('network') || kinds.has('rate_limited'),
        isContractPanic: innermostMatch ? PANIC_KINDS.has(innermostMatch.kind) : false,
        isContractRevert,
        code,
        failingContract,
        failingEntrypoint,
        contractSymbol,
        reason,
        reasons,
        frames,
        raw: err,
    };
}

/** One-line, plain-English description of a Starknet error (message plus hint). */
export function formatStarknetError(err: unknown, opts?: ParseStarknetErrorOptions): string {
    const p = parseStarknetError(err, opts);
    return p.hint ? `${p.message} ${p.hint}` : p.message;
}
