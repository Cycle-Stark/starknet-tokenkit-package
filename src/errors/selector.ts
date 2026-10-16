// Minimal keccak-256 + Starknet selector derivation.
//
// starknet-tokenkit does not ship `starknet` as a runtime dependency (only as a
// devDependency for tests), so the error parser derives selectors itself. The
// output is verified against `hash.getSelectorFromName` from starknet.js in the
// test suite. Only used for small inputs (ABI entrypoint names), so a BigInt
// implementation is plenty fast.

const MASK64 = (1n << 64n) - 1n;

const ROUND_CONSTANTS: bigint[] = /* @__PURE__ */ (() => {
    const rcBit = (t: number): bigint => {
        let r = 1;
        for (let i = 0; i < t % 255; i++) {
            r <<= 1;
            if (r & 0x100) r ^= 0x171;
        }
        return BigInt(r & 1);
    };
    const out: bigint[] = [];
    for (let round = 0; round < 24; round++) {
        let rc = 0n;
        for (let j = 0; j < 7; j++) {
            rc |= rcBit(j + 7 * round) << BigInt((1 << j) - 1);
        }
        out.push(rc);
    }
    return out;
})();

// ROTATIONS[x + 5 * y]
const ROTATIONS: number[] = /* @__PURE__ */ (() => {
    const r = new Array<number>(25).fill(0);
    let x = 1;
    let y = 0;
    for (let t = 0; t < 24; t++) {
        r[x + 5 * y] = (((t + 1) * (t + 2)) / 2) % 64;
        const nx = y;
        const ny = (2 * x + 3 * y) % 5;
        x = nx;
        y = ny;
    }
    return r;
})();

const rotl = (v: bigint, n: number): bigint =>
    n === 0 ? v : ((v << BigInt(n)) | (v >> BigInt(64 - n))) & MASK64;

function keccakF(s: bigint[]): void {
    const c = new Array<bigint>(5);
    const b = new Array<bigint>(25);
    for (let round = 0; round < 24; round++) {
        for (let x = 0; x < 5; x++) c[x] = s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20];
        for (let x = 0; x < 5; x++) {
            const d = c[(x + 4) % 5] ^ rotl(c[(x + 1) % 5], 1);
            for (let y = 0; y < 25; y += 5) s[x + y] ^= d;
        }
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(s[x + 5 * y], ROTATIONS[x + 5 * y]);
            }
        }
        for (let y = 0; y < 25; y += 5) {
            for (let x = 0; x < 5; x++) {
                s[x + y] = b[x + y] ^ (~b[((x + 1) % 5) + y] & MASK64 & b[((x + 2) % 5) + y]);
            }
        }
        s[0] ^= ROUND_CONSTANTS[round];
    }
}

/** keccak-256 (original Keccak padding, as used by Ethereum and Starknet). */
export function keccak256(data: Uint8Array): Uint8Array {
    const rate = 136;
    const padLen = rate - (data.length % rate);
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data);
    padded[data.length] ^= 0x01;
    padded[padded.length - 1] ^= 0x80;

    const s = new Array<bigint>(25).fill(0n);
    for (let off = 0; off < padded.length; off += rate) {
        for (let i = 0; i < rate / 8; i++) {
            let lane = 0n;
            for (let k = 7; k >= 0; k--) lane = (lane << 8n) | BigInt(padded[off + i * 8 + k]);
            s[i] ^= lane;
        }
        keccakF(s);
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 4; i++) {
        let lane = s[i];
        for (let k = 0; k < 8; k++) {
            out[i * 8 + k] = Number(lane & 0xffn);
            lane >>= 8n;
        }
    }
    return out;
}

const MASK250 = (1n << 250n) - 1n;

/** Same result as starknet.js `hash.getSelectorFromName(name)`. */
export function selectorFromName(name: string): string {
    const digest = keccak256(new TextEncoder().encode(name));
    let n = 0n;
    for (const byte of digest) n = (n << 8n) | BigInt(byte);
    return '0x' + (n & MASK250).toString(16);
}
