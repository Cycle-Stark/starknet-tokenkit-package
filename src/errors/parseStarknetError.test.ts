import { describe, expect, it } from 'vitest';
import { hash, LibraryError, RpcError, shortString } from 'starknet';
import { BUILTIN_ENTRYPOINT_NAMES, BUILTIN_SELECTOR_TABLE } from './entrypoints';
import type { StarknetErrorKind } from './classify';
import { formatStarknetError, parseStarknetError } from './parseStarknetError';
import { selectorFromName } from './selector';

const ETH = '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
const STRK = '0x4718f5a0fc34cc1af16a1cdee98ffc1f4f8b2bc7f2d2aec0f5a8f8bdd5f4b3e';
const ACCOUNT = '0x2ebcf456f3eb71b5841eabf82b7417cf96a8aebc7b5a972b9c87f0fde43ae6a';
const VAULT = '0x5e1f6b2c3a4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e';
const TOKENS = [
    { address: ETH, symbol: 'ETH' },
    { address: STRK, symbol: 'STRK' },
];
const sel = (n: string) => hash.getSelectorFromName(n);
const TRANSFER = sel('transfer');
const EXECUTE = sel('__execute__');
const enc = (s: string) => shortString.encodeShortString(s);
const annotate = (s: string) => `${enc(s)} ('${s}')`;

// Real sample from the task (message text as produced by starknet.js RpcError).
const SAMPLE_TAIL = `41: Transaction execution error: {"transaction_index":0,"execution_error":{"class_hash":"0x36078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f","contract_address":"${ACCOUNT}","error":"(0x617267656e742f6d756c746963616c6c2d6661696c6564 ('argent/multicall-failed'), 0x0 (''), 0x45524332303a20696e73756666696369656e742062616c616e6365 ('ERC20: insufficient balance'), 0x454e545259504f494e545f4641494c4544 ('ENTRYPOINT_FAILED'))","selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad"}}`;

const invokeParams = (calldata: string[]) => ({
    request: [{ type: 'INVOKE', sender_address: ACCOUNT, calldata, version: '0x3', signature: [], nonce: '0x5' }],
    simulation_flags: ['SKIP_VALIDATE'],
    block_id: 'pending',
});
// __execute__ calldata: 1 call -> ETH.transfer(recipient, u256 amount)
const ETH_TRANSFER_PARAMS = invokeParams(['0x1', ETH, TRANSFER, '0x3', '0x123', '0xde0b6b3a7640000', '0x0']);

/** RPC 0.8 nested execution error: account __execute__ -> contract.entrypoint -> reason tuple. */
const nested = (contract: string, entrypoint: string, ...reasons: string[]) => ({
    code: 41,
    message: 'Transaction execution error',
    data: {
        transaction_index: 0,
        execution_error: {
            contract_address: ACCOUNT,
            class_hash: '0xabc',
            selector: EXECUTE,
            error: {
                contract_address: contract,
                class_hash: '0xdef',
                selector: sel(entrypoint),
                error: `(${[...reasons.map(annotate), annotate('ENTRYPOINT_FAILED')].join(', ')})`,
            },
        },
    },
});

// Real revert strings collected from contract sources (2026-10), used as test
// fixtures. Each maps a reason to the kind the parser should report.
//
// Sources:
//   OpenZeppelin/cairo-contracts  packages/{token,access,security,account,utils}
//   argentlabs/argent-contracts-starknet  src/
//   myBraavos/braavos-account-cairo  src/
//   starkware-libs/cairo  corelib/src/{integer,option,result,array}.cairo
//   avnu-labs/avnu-contracts-v2  src/exchange.cairo
//   EkuboProtocol/starknet-contracts  src/{core,router}.cairo
//   vesuxyz/vesu-v1  src/

const REASON_FIXTURES: [source: string, reason: string, kind: StarknetErrorKind][] = [
    // OpenZeppelin ERC20 / ERC721 / ERC1155
    ['OZ ERC20', 'ERC20: insufficient balance', 'insufficient_balance'],
    ['OZ ERC20', 'ERC20: insufficient allowance', 'insufficient_allowance'],
    ['OZ ERC20', 'ERC20: transfer to 0', 'invalid_address'],
    ['OZ ERC20', 'ERC20: approve to 0', 'invalid_address'],
    ['OZ ERC20', 'ERC20: invalid permit signature', 'invalid_signature'],
    ['OZ ERC20', 'ERC20: expired permit signature', 'invalid_signature'],
    ['OZ ERC1155', 'ERC1155: insufficient balance', 'insufficient_balance'],
    ['OZ ERC721', 'ERC721: unauthorized caller', 'unauthorized_caller'],
    ['OZ ERC721', 'ERC721: invalid receiver', 'invalid_address'],
    // OpenZeppelin access / security / account
    ['OZ Ownable', 'Caller is not the owner', 'unauthorized_caller'],
    ['OZ Ownable', 'Caller is not the pending owner', 'unauthorized_caller'],
    ['OZ AccessControl', 'Caller is missing role', 'unauthorized_caller'],
    ['OZ Pausable', 'Pausable: paused', 'paused'],
    ['OZ ReentrancyGuard', 'ReentrancyGuard: reentrant call', 'reentrancy'],
    ['OZ Account', 'Account: invalid signature', 'invalid_signature'],
    ['OZ Account', 'Account: invalid caller', 'unauthorized_caller'],
    ['OZ Nonces', 'Nonces: invalid nonce', 'invalid_nonce'],
    // Argent
    ['Argent', 'argent/invalid-signature', 'invalid_signature'],
    ['Argent', 'argent/invalid-owner-sig', 'invalid_signature'],
    ['Argent', 'argent/invalid-guardian-sig', 'invalid_signature'],
    ['Argent', 'argent/missing-guardian-sig', 'invalid_signature'],
    ['Argent', 'argent/max-fee-too-high', 'fee_rejected'],
    ['Argent', 'argent/tip-too-high', 'fee_rejected'],
    ['Argent', 'argent/only-self', 'unauthorized_caller'],
    ['Argent', 'argent/forbidden-call', 'unauthorized_caller'],
    ['Argent session', 'session/expired', 'session_error'],
    ['Argent session', 'session/revoked', 'session_error'],
    // Braavos
    ['Braavos', 'INVALID_SIG', 'invalid_signature'],
    ['Braavos', 'INVALID_NONCE', 'invalid_nonce'],
    ['Braavos', 'MAX_FEE_TOO_HIGH', 'fee_rejected'],
    ['Braavos', 'BAD_BALANCE', 'insufficient_balance'],
    ['Braavos', 'NOT_ALLOWED', 'unauthorized_caller'],
    // Cairo corelib panics
    ['corelib', 'u256_sub Overflow', 'arithmetic_overflow'],
    ['corelib', 'u256_add Overflow', 'arithmetic_overflow'],
    ['corelib', 'u128_sub Overflow', 'arithmetic_overflow'],
    ['corelib', 'u64_mul Overflow', 'arithmetic_overflow'],
    ['corelib', 'Option::unwrap failed.', 'unwrap_failed'],
    ['corelib', 'Result::unwrap failed.', 'unwrap_failed'],
    ['corelib', 'Division by 0', 'division_by_zero'],
    ['corelib', 'Index out of bounds', 'index_out_of_bounds'],
    // AVNU
    ['AVNU', 'Insufficient tokens received', 'slippage'],
    ['AVNU', 'Token from balance is too low', 'insufficient_balance'],
    ['AVNU', 'Unknown exchange', 'route_unavailable'],
    ['AVNU', 'Routes is empty', 'route_unavailable'],
    // Ekubo
    ['Ekubo', 'LIMIT_MAG', 'slippage'],
    ['Ekubo', 'INSUFFICIENT_SAVED_BALANCE', 'insufficient_balance'],
    ['Ekubo', 'Pool not initialized', 'route_unavailable'],
    // Vesu
    ['Vesu', 'not-collateralized', 'lending_limit'],
    ['Vesu', 'dusty-debt-balance', 'lending_limit'],
    ['Vesu', 'utilization-exceeded', 'lending_limit'],
    ['Vesu', 'debt-cap-exceeded', 'lending_limit'],
    ['Vesu', 'caller-not-owner', 'unauthorized_caller'],
    // Generic
    ['generic', 'ENTRYPOINT_NOT_FOUND', 'entrypoint_not_found'],
    ['generic', 'Deadline passed', 'deadline_expired'],
];

describe('selector table', () => {
    it('matches starknet.js getSelectorFromName', () => {
        for (const name of BUILTIN_ENTRYPOINT_NAMES) {
            const s = sel(name);
            expect(selectorFromName(name)).toBe(s);
            expect(BUILTIN_SELECTOR_TABLE[s]).toBe(name);
        }
        expect(Object.keys(BUILTIN_SELECTOR_TABLE)).toHaveLength(BUILTIN_ENTRYPOINT_NAMES.length);
    });
});

describe('real revert strings (research fixtures)', () => {
    it.each(REASON_FIXTURES)('%s: %s -> %s', (_src, reason, kind) => {
        const p = parseStarknetError({
            code: 40,
            message: 'Contract error',
            data: { revert_error: { contract_address: VAULT, selector: sel('do_something'), error: annotate(reason) } },
        });
        expect(p.kind).toBe(kind);
        expect(p.reason).toBe(reason);
        expect(p.isContractRevert).toBe(true);
    });
});

describe('the real argent multicall sample', () => {
    it('parses message text with "{...}" params', () => {
        const p = parseStarknetError(new LibraryError(`RPC: starknet_estimateFee with params {...}\n\n      ${SAMPLE_TAIL}`), { tokens: TOKENS });
        expect(p.kind).toBe('insufficient_balance');
        expect(p.confidence).toBe('certain');
        expect(p.isInsufficientBalance).toBe(true);
        expect(p.isContractPanic).toBe(false);
        expect(p.code).toBe(41);
        expect(p.reason).toBe('ERC20: insufficient balance');
        expect(p.reasons).toEqual(['ERC20: insufficient balance']);
        expect(p.frames[0]).toMatchObject({ contract: ACCOUNT, entrypoint: '__execute__', reason: 'ERC20: insufficient balance' });
        // No calldata: the failing function is the account's __execute__.
        expect(p.failingEntrypoint).toBe('__execute__');
        expect(p.message).toBe(
            `You don't have enough tokens for this transaction. The call to __execute__ on 0x2ebc…ae6a failed with "ERC20: insufficient balance".`,
        );
    });

    it('resolves ETH.transfer via the argent call index and RpcError calldata', () => {
        const err = new RpcError(
            { code: 41, message: 'Transaction execution error', data: JSON.parse(SAMPLE_TAIL.slice(SAMPLE_TAIL.indexOf('{'))) } as never,
            'starknet_estimateFee',
            ETH_TRANSFER_PARAMS,
        );
        const p = parseStarknetError(err, { tokens: TOKENS });
        expect(p.kind).toBe('insufficient_balance');
        expect(p.failingContract).toBe(ETH);
        expect(p.contractSymbol).toBe('ETH');
        expect(p.failingEntrypoint).toBe('transfer');
        expect(p.message).toBe(`You don't have enough ETH for this transfer. The call to transfer on ETH failed with "ERC20: insufficient balance".`);
        expect(p.raw).toBe(err);
        expect(formatStarknetError(err, { tokens: TOKENS })).toContain('Lower the amount or add funds');
    });

    it('picks the right call when argent reports a non-zero index', () => {
        const data = {
            execution_error: {
                contract_address: ACCOUNT,
                selector: EXECUTE,
                error: `(${annotate('argent/multicall-failed')}, 0x1 (''), ${annotate('Insufficient tokens received')}, ${annotate('ENTRYPOINT_FAILED')})`,
            },
        };
        const avnu = '0x4270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f';
        const p = parseStarknetError(
            { code: 41, message: 'Transaction execution error', data },
            { tokens: TOKENS, calls: [{ contractAddress: ETH, entrypoint: 'approve' }, { contractAddress: avnu, entrypoint: 'multi_route_swap' }] },
        );
        expect(p.kind).toBe('slippage');
        expect(p.isSlippage).toBe(true);
        expect(p.failingContract).toBe(avnu);
        expect(p.failingEntrypoint).toBe('multi_route_swap');
        expect(p.retryable).toBe(true);
    });

    it('reads calldata from message text when params are real JSON', () => {
        const text = `RPC: starknet_estimateFee with params ${JSON.stringify(ETH_TRANSFER_PARAMS, null, 2)}\n\n      ${SAMPLE_TAIL}`;
        const p = parseStarknetError(new Error(text), { tokens: TOKENS });
        expect(p.contractSymbol).toBe('ETH');
        expect(p.failingEntrypoint).toBe('transfer');
    });
});

describe('u256_sub Overflow is never over-claimed', () => {
    it('in a non-token contract it is an arithmetic panic in that function', () => {
        const p = parseStarknetError(nested(VAULT, 'withdraw', 'u256_sub Overflow'), { tokens: TOKENS });
        expect(p.kind).toBe('arithmetic_overflow');
        expect(p.isInsufficientBalance).toBe(false);
        expect(p.isContractPanic).toBe(true);
        expect(p.confidence).toBe('certain');
        expect(p.failingContract).toBe(VAULT);
        expect(p.failingEntrypoint).toBe('withdraw');
        expect(p.message).toBe('The call to withdraw on 0x5e1f…5d6e failed: a number went below zero (u256_sub Overflow).');
    });

    it('in a token non-debit function it is still only a panic', () => {
        const p = parseStarknetError(nested(STRK, 'approve', 'u256_sub Overflow'), { tokens: TOKENS });
        expect(p.kind).toBe('arithmetic_overflow');
        expect(p.isInsufficientBalance).toBe(false);
        expect(p.message).toBe('The call to approve on STRK failed: a number went below zero (u256_sub Overflow).');
    });

    it('in a known token transfer it is likely insufficient balance (RPC 0.8 nested)', () => {
        const p = parseStarknetError(nested(STRK, 'transfer', 'u256_sub Overflow'), { tokens: TOKENS });
        expect(p.frames).toHaveLength(2);
        expect(p.frames[1]).toMatchObject({ contract: STRK, entrypoint: 'transfer', reason: 'u256_sub Overflow' });
        expect(p.kind).toBe('insufficient_balance');
        expect(p.confidence).toBe('likely');
        expect(p.isInsufficientBalance).toBe(true);
        expect(p.isInsufficientAllowance).toBe(false);
        expect(p.isContractPanic).toBe(true);
        expect(p.message).toBe(
            "The call to transfer on STRK failed: a number went below zero (u256_sub Overflow). This usually means you don't have enough STRK for this transfer.",
        );
    });

    it('in a token transfer_from it flags both balance and allowance', () => {
        const p = parseStarknetError(nested(ETH, 'transfer_from', 'u256_sub Overflow'), { tokens: TOKENS });
        expect(p.confidence).toBe('likely');
        expect(p.isInsufficientBalance).toBe(true);
        expect(p.isInsufficientAllowance).toBe(true);
    });

    it('handles a code-40 RPC 0.7 string trace', () => {
        const revert =
            `Error in the called contract (contract address: ${ACCOUNT}, class hash: 0x123, selector: ${EXECUTE}):\n` +
            'Error at pc=0:4835:\nCairo traceback (most recent call last):\nUnknown location (pc=0:67)\n\n' +
            `Error in the called contract (contract address: ${STRK}, class hash: 0x456, selector: ${TRANSFER}):\n` +
            `Execution failed. Failure reason: ${annotate('u256_sub Overflow')}.\n`;
        const p = parseStarknetError({ code: 40, message: 'Contract error', data: { revert_error: revert } }, { tokens: TOKENS });
        expect(p.code).toBe(40);
        expect(p.frames.map((f) => f.entrypoint)).toEqual(['__execute__', 'transfer']);
        expect(p.kind).toBe('insufficient_balance');
        expect(p.confidence).toBe('likely');
        expect(p.contractSymbol).toBe('STRK');
    });

    it('without token context, a token-shaped transfer is not assumed', () => {
        const p = parseStarknetError(nested(STRK, 'transfer', 'u256_sub Overflow'));
        expect(p.kind).toBe('arithmetic_overflow');
        expect(p.isInsufficientBalance).toBe(false);
    });
});

describe('several reasons', () => {
    it('collects every meaningful reason and sets flags for each', () => {
        const p = parseStarknetError(nested(VAULT, 'swap', 'Insufficient tokens received', 'ERC20: insufficient allowance'));
        expect(p.reasons).toEqual(['Insufficient tokens received', 'ERC20: insufficient allowance']);
        expect(p.reason).toBe('ERC20: insufficient allowance');
        expect(p.kind).toBe('insufficient_allowance');
        expect(p.isSlippage).toBe(true);
        expect(p.isInsufficientAllowance).toBe(true);
    });

    it('prefers a specific reason over Option::unwrap failed', () => {
        const p = parseStarknetError(nested(VAULT, 'claim', 'Caller is not the owner', 'Option::unwrap failed.'));
        expect(p.reason).toBe('Caller is not the owner');
        expect(p.kind).toBe('unauthorized_caller');
        expect(p.isPermissionDenied).toBe(true);
    });

    it('decodes un-annotated felts and ByteArray panics', () => {
        const p1 = parseStarknetError({ code: 41, message: 'x', data: { execution_error: { contract_address: ETH, selector: sel('transfer_from'), error: `(${enc('ERC20: insufficient allowance')}, ${enc('ENTRYPOINT_FAILED')})` } } }, { tokens: TOKENS });
        expect(p1.reason).toBe('ERC20: insufficient allowance');
        expect(p1.message).toContain('The call to transfer_from on ETH');

        const longMsg = 'Position health factor would drop below the minimum';
        // ByteArray: [MAGIC, n_full, ...full words (31 bytes), pending, pending_len]
        const words = [];
        for (let i = 0; i + 31 <= longMsg.length; i += 31) words.push(enc(longMsg.slice(i, i + 31)));
        const rest = longMsg.slice(words.length * 31);
        const felts = ['0x46a6158a16a947e5916b2a2ca68501a45e93d7110e81aa2d6438b1c57c879a3', `0x${words.length.toString(16)}`, ...words, enc(rest), `0x${rest.length.toString(16)}`];
        const p2 = parseStarknetError({ code: 40, message: 'Contract error', data: { revert_error: { contract_address: VAULT, selector: sel('borrow'), error: `(${felts.join(', ')})` } } });
        expect(p2.reason).toBe(longMsg);
        expect(p2.kind).toBe('contract_error');
        expect(p2.confidence).toBe('unknown');
        expect(p2.message).toBe(`The call to borrow on 0x5e1f…5d6e failed: ${longMsg}.`);
    });

    it('resolves custom selectors from an ABI', () => {
        const abi = [{ type: 'interface', name: 'IVault', items: [{ type: 'function', name: 'open_position', inputs: [], outputs: [] }] }];
        const p = parseStarknetError(
            { code: 40, message: 'Contract error', data: { revert_error: { contract_address: VAULT, selector: sel('open_position'), error: annotate('Vault: position too small') } } },
            { abi },
        );
        expect(p.failingEntrypoint).toBe('open_position');
        expect(p.kind).toBe('contract_error');
        expect(p.message).toBe('The call to open_position on 0x5e1f…5d6e failed: Vault: position too small.');
    });
});

describe('RPC, wallet and transport errors', () => {
    it.each([
        [20, 'Contract not found', undefined, 'contract_not_found'],
        [21, 'Requested entrypoint does not exist in the contract', undefined, 'entrypoint_not_found'],
        [28, 'Class hash not found', undefined, 'class_hash_not_found'],
        [51, 'Class already declared', undefined, 'class_already_declared'],
        [52, 'Invalid transaction nonce', 'Account nonce: 0x5; got: 0x4', 'invalid_nonce'],
        [53, 'Max fee is smaller than the minimal transaction cost (validation plus fee transfer)', undefined, 'insufficient_max_fee'],
        [54, "Account balance is smaller than the transaction's max_fee", undefined, 'insufficient_fee_balance'],
        [55, 'Account validation failed', 'some validate error', 'validation_failure'],
        [60, 'the compiled class hash did not match the one supplied in the transaction', undefined, 'compiled_class_hash_mismatch'],
    ])('maps RPC code %i', (code, message, data, kind) => {
        const p = parseStarknetError({ code, message, data });
        expect(p.kind).toBe(kind);
        expect(p.code).toBe(code);
        expect(p.confidence).toBe('certain');
    });

    it('sets fee and nonce flags', () => {
        expect(parseStarknetError({ code: 53, message: 'x' }).isInsufficientFee).toBe(true);
        expect(parseStarknetError({ code: 54, message: 'x' }).isInsufficientFee).toBe(true);
        expect(parseStarknetError({ code: 52, message: 'x' }).isNonce).toBe(true);
    });

    it('code 55 with an argent signature reason is a signature error', () => {
        const p = parseStarknetError({ code: 55, message: 'Account validation failed', data: annotate('argent/invalid-owner-sig') });
        expect(p.kind).toBe('invalid_signature');
        expect(p.isSignature).toBe(true);
    });

    it('detects an undeployed account', () => {
        const err = new RpcError({ code: 20, message: 'Contract not found' } as never, 'starknet_estimateFee', ETH_TRANSFER_PARAMS);
        expect(parseStarknetError(err).kind).toBe('account_not_deployed');
    });

    it('classifies wallet and transport errors', () => {
        const rejected = parseStarknetError({ code: 4001, message: 'User rejected the request.' });
        expect(rejected.kind).toBe('user_rejected');
        expect(rejected.isUserRejected).toBe(true);
        expect(parseStarknetError({ code: 4100, message: 'Unauthorized' }).isPermissionDenied).toBe(true);
        const net = parseStarknetError('TypeError: Failed to fetch');
        expect(net.kind).toBe('network');
        expect(net.isNetwork).toBe(true);
        expect(net.confidence).toBe('likely');
        expect(parseStarknetError(new Error('429 Too Many Requests')).kind).toBe('rate_limited');
    });

    it('falls back to a plain string', () => {
        const p = parseStarknetError('Something odd happened');
        expect(p.kind).toBe('unknown');
        expect(p.confidence).toBe('unknown');
        expect(p.reason).toBe('Something odd happened');
        expect(p.message).toBe('The transaction failed: Something odd happened.');
        expect(p.frames).toEqual([]);
        expect(p.isContractRevert).toBe(false);
    });

    it('never emits em-dashes', () => {
        const samples: unknown[] = ['x', { code: 20 }, { code: 53 }, { code: 4001 }, 'Failed to fetch', nested(STRK, 'transfer', 'u256_sub Overflow'), ...REASON_FIXTURES.map(([, r]) => r)];
        for (const s of samples) expect(formatStarknetError(s, { tokens: TOKENS })).not.toMatch(/—/);
    });
});
