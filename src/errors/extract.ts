// Extraction: pull the RPC code, data, request params and call frames out of
// whatever shape the error arrived in.

import { decodeByteArrayAt, decodeShortString } from './felts';

export interface RpcInfo {
    code?: number;
    rpcMessage?: string;
    data?: unknown;
    text: string;
    params?: unknown;
}

export interface RawFrame {
    contract?: string;
    selector?: string;
    reasons: string[];
    /** Index of the failing call, from Argent's ('argent/multicall-failed', index). */
    callIndex?: number;
}

export function isObject(v: unknown): v is Record<string, unknown> {
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

function safeStringify(v: unknown): string {
    try {
        return JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? val.toString() : val)) ?? '';
    } catch {
        return String(v);
    }
}

export function getRpcInfo(err: unknown): RpcInfo {
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

/** Strip the "with params {...}" block so calldata felts are never read as reasons. */
export function stripParams(text: string): string {
    return text.replace(/with params [\s\S]*?\n\s*\n/, '\n');
}

interface FeltItem {
    felt: string;
    label?: string;
}

const FELT_TOKEN_RE = /(0x[0-9a-fA-F]+)(?:\s*\((?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\))?/g;
const ANNOTATED_RE = /(0x[0-9a-fA-F]+)\s*\((?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\)/g;

function scan(re: RegExp, text: string): FeltItem[] {
    const items: FeltItem[] = [];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) items.push({ felt: m[1], label: m[2] ?? m[3] });
    return items;
}

/** Turn a felt list (panic data) into reasons, honouring ByteArrays and Argent's call index. */
function itemsToReasons(items: FeltItem[]): { reasons: string[]; callIndex?: number } {
    const felts = items.map((i) => i.felt);
    const reasons: string[] = [];
    let callIndex: number | undefined;
    for (let i = 0; i < items.length; i++) {
        const ba = decodeByteArrayAt(felts, i);
        if (ba) {
            reasons.push(ba.text);
            i += ba.consumed - 1;
            continue;
        }
        const { felt, label } = items[i];
        const text = label || decodeShortString(felt) || (BigInt(felt) === 0n ? '' : felt);
        if (text === 'argent/multicall-failed' && i + 1 < items.length) {
            reasons.push(text);
            try {
                callIndex = Number(BigInt(items[i + 1].felt));
            } catch {
                /* ignore */
            }
            i++;
            continue;
        }
        reasons.push(text);
    }
    return { reasons, callIndex };
}

/** Decode every revert reason in a chunk of error text, in order (outermost first). */
export function decodeReasons(text: string): { reasons: string[]; callIndex?: number } {
    const errorMessages = [...text.matchAll(/Error message:\s*([^\n]+)/g)].map((x) => x[1].trim());

    let slice: string | undefined;
    const fr = /Failure reason:\s*([\s\S]*?)(?:\.\s*(?:\n|$)|\n|$)/.exec(text);
    const trimmed = text.trim();
    if (fr) slice = fr[1];
    else if (/^\(.*\)$/s.test(trimmed) && /^\(\s*0x/.test(trimmed)) slice = trimmed.slice(1, -1);
    else if (/^0x[0-9a-fA-F]+$/.test(trimmed)) slice = trimmed;

    if (slice !== undefined) {
        const items = scan(FELT_TOKEN_RE, slice);
        if (items.length) {
            const r = itemsToReasons(items);
            return { reasons: [...errorMessages, ...r.reasons], callIndex: r.callIndex };
        }
        return { reasons: [...errorMessages, slice.replace(/\.\s*$/, '').trim()] };
    }

    const annotated = scan(ANNOTATED_RE, text);
    if (annotated.length) {
        const r = itemsToReasons(annotated);
        return { reasons: [...errorMessages, ...r.reasons], callIndex: r.callIndex };
    }
    return { reasons: errorMessages };
}

/** Split a v0.7-style string trace into frames ("Error in the called contract (...)"). */
export function framesFromText(text: string): RawFrame[] {
    const parts = text.split(/Error in (?:the called )?contract\s*\(/);
    if (parts.length <= 1) {
        const r = decodeReasons(text);
        return r.reasons.length ? [{ reasons: r.reasons, callIndex: r.callIndex }] : [];
    }
    const frames: RawFrame[] = [];
    const lead = decodeReasons(parts[0]);
    if (lead.reasons.length) frames.push({ reasons: lead.reasons, callIndex: lead.callIndex });
    for (const part of parts.slice(1)) {
        const header = part.slice(0, part.indexOf(')') + 1);
        const contract =
            /contract address:\s*(0x[0-9a-fA-F]+)/.exec(header)?.[1] ?? /^\s*(0x[0-9a-fA-F]+)\s*\)/.exec(header)?.[1];
        const selector = /selector:\s*(0x[0-9a-fA-F]+)/.exec(header)?.[1];
        const r = decodeReasons(part.slice(header.length));
        frames.push({ contract, selector, reasons: r.reasons, callIndex: r.callIndex });
    }
    return frames;
}

/** Walk RPC 0.8+ nested `execution_error` / `revert_error` trees (or strings). */
export function walkExecutionError(node: unknown, frames: RawFrame[], depth = 0): void {
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
            if (inner.length === 1 && !inner[0].contract) {
                frame.reasons = inner[0].reasons;
                frame.callIndex = inner[0].callIndex;
            } else frames.push(...inner);
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
// Calls (to attribute an account `__execute__` failure to the call that failed)
// ---------------------------------------------------------------------------

export interface CallRef {
    to: string;
    selector?: string;
    entrypoint?: string;
}

export function findInvokeTx(params: unknown, depth = 0): Record<string, unknown> | undefined {
    if (depth > 6 || !isObject(params)) return undefined;
    if (Array.isArray(params.calldata) && 'sender_address' in params) return params;
    for (const v of Array.isArray(params) ? params : Object.values(params)) {
        const found = findInvokeTx(v, depth + 1);
        if (found) return found;
    }
    return undefined;
}

/** Decode Cairo 1 `__execute__` calldata: [n, (to, selector, len, ...data)*]. */
export function decodeExecuteCalldata(calldata: unknown[]): CallRef[] {
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
