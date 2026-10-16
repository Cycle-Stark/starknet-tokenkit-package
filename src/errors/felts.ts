// Felt helpers: address normalization, Cairo short strings, ByteArray panics.

export function normalizeAddress(addr: unknown): string | undefined {
    if (typeof addr !== 'string' && typeof addr !== 'bigint' && typeof addr !== 'number') return undefined;
    try {
        return '0x' + BigInt(addr as string).toString(16);
    } catch {
        return undefined;
    }
}

/** Decode a felt to a Cairo short string, or undefined if it isn't printable ASCII. */
export function decodeShortString(felt: string): string | undefined {
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

/** Magic first felt of a serialized Cairo `ByteArray` panic. */
export const BYTE_ARRAY_MAGIC = BigInt('0x46a6158a16a947e5916b2a2ca68501a45e93d7110e81aa2d6438b1c57c879a3');

function feltToBytes(felt: string, len: number): string {
    let hex = BigInt(felt).toString(16).padStart(len * 2, '0');
    hex = hex.slice(hex.length - len * 2);
    let s = '';
    for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    return s;
}

/**
 * Decode a ByteArray panic starting at `felts[start]` (the magic felt).
 * Layout: [MAGIC, n_full_words, ...words(31 bytes), pending_word, pending_len].
 */
export function decodeByteArrayAt(felts: string[], start: number): { text: string; consumed: number } | undefined {
    try {
        if (BigInt(felts[start]) !== BYTE_ARRAY_MAGIC) return undefined;
        const fullWords = Number(BigInt(felts[start + 1]));
        const end = start + 4 + fullWords;
        if (!Number.isFinite(fullWords) || felts.length < end) return undefined;
        let text = '';
        for (let i = 0; i < fullWords; i++) text += feltToBytes(felts[start + 2 + i], 31);
        const pendingLen = Number(BigInt(felts[start + 3 + fullWords]));
        if (pendingLen > 0) text += feltToBytes(felts[start + 2 + fullWords], pendingLen);
        return { text, consumed: 4 + fullWords };
    } catch {
        return undefined;
    }
}

export function shortAddress(addr: string): string {
    const a = normalizeAddress(addr) ?? addr;
    return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
