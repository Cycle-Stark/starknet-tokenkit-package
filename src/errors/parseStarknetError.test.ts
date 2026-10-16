import { describe, expect, it } from 'vitest';
import { hash, LibraryError, RpcError, shortString } from 'starknet';
import {
    BUILTIN_ENTRYPOINT_NAMES,
    BUILTIN_SELECTOR_TABLE,
    formatStarknetError,
    parseStarknetError,
} from './parseStarknetError';
import { selectorFromName } from './selector';

const ETH = '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
const STRK = '0x4718f5a0fc34cc1af16a1cdee98ffc1f4f8b2bc7f2d2aec0f5a8f8bdd5f4b3e';
const ACCOUNT = '0x2ebcf456f3eb71b5841eabf82b7417cf96a8aebc7b5a972b9c87f0fde43ae6a';
const TOKENS = [
    { address: ETH, symbol: 'ETH' },
    { address: STRK, symbol: 'STRK' },
];
const TRANSFER = hash.getSelectorFromName('transfer');
const EXECUTE = hash.getSelectorFromName('__execute__');

// Real sample from the task (message text as produced by starknet.js RpcError).
const SAMPLE_TAIL =
    `41: Transaction execution error: {"transaction_index":0,"execution_error":{"class_hash":"0x36078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f","contract_address":"${ACCOUNT}","error":"(0x617267656e742f6d756c746963616c6c2d6661696c6564 ('argent/multicall-failed'), 0x0 (''), 0x45524332303a20696e73756666696369656e742062616c616e6365 ('ERC20: insufficient balance'), 0x454e545259504f494e545f4641494c4544 ('ENTRYPOINT_FAILED'))","selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad"}}`;

const estimateParams = {
    request: [
        {
            type: 'INVOKE',
            sender_address: ACCOUNT,
            // __execute__ calldata: 1 call -> ETH.transfer(recipient, u256 amount)
            calldata: ['0x1', ETH, TRANSFER, '0x3', '0x123', '0xde0b6b3a7640000', '0x0'],
            version: '0x3',
            signature: [],
            nonce: '0x5',
        },
    ],
    simulation_flags: ['SKIP_VALIDATE'],
    block_id: 'pending',
};

describe('selector table', () => {
    it('matches starknet.js getSelectorFromName', () => {
        for (const name of BUILTIN_ENTRYPOINT_NAMES) {
            const sel = hash.getSelectorFromName(name);
            expect(selectorFromName(name)).toBe(sel);
            expect(BUILTIN_SELECTOR_TABLE[sel]).toBe(name);
        }
        expect(Object.keys(BUILTIN_SELECTOR_TABLE)).toHaveLength(BUILTIN_ENTRYPOINT_NAMES.length);
    });
});

describe('parseStarknetError', () => {
    it('decodes the real argent multicall sample (message text with "{...}" params)', () => {
        const err = new LibraryError(`RPC: starknet_estimateFee with params {...}\n\n      ${SAMPLE_TAIL}`);
        const p = parseStarknetError(err, { tokens: TOKENS });
        expect(p.kind).toBe('insufficient_balance');
        expect(p.code).toBe(41);
        expect(p.reason).toBe('ERC20: insufficient balance');
        expect(p.frames).toHaveLength(1);
        expect(p.frames[0]).toMatchObject({ contract: ACCOUNT, entrypoint: '__execute__', reason: 'ERC20: insufficient balance' });
        // No calldata available, so the token can't be named.
        expect(p.message).toBe("You don't have enough tokens for this transaction.");
    });

    it('names ETH and transfer from the RpcError request calldata', () => {
        const err = new RpcError(
            {
                code: 41,
                message: 'Transaction execution error',
                data: JSON.parse(SAMPLE_TAIL.slice(SAMPLE_TAIL.indexOf('{'))),
            } as never,
            'starknet_estimateFee',
            estimateParams,
        );
        const p = parseStarknetError(err, { tokens: TOKENS });
        expect(p.kind).toBe('insufficient_balance');
        expect(p.code).toBe(41);
        expect(p.contract).toBe(ETH);
        expect(p.contractSymbol).toBe('ETH');
        expect(p.entrypoint).toBe('transfer');
        expect(p.message).toBe("You don't have enough ETH for this transfer.");
        expect(p.retryable).toBe(false);
        expect(p.raw).toBe(err);
        expect(formatStarknetError(err, { tokens: TOKENS })).toBe(
            "You don't have enough ETH for this transfer. Lower the amount or add funds, then try again.",
        );
    });

    it('reads calldata from the message text when params are real JSON', () => {
        const text = `RPC: starknet_estimateFee with params ${JSON.stringify(estimateParams, null, 2)}\n\n      ${SAMPLE_TAIL}`;
        const p = parseStarknetError(new Error(text), { tokens: TOKENS });
        expect(p.contractSymbol).toBe('ETH');
        expect(p.message).toBe("You don't have enough ETH for this transfer.");
    });

    it('handles a code-40 u256_sub Overflow revert (RPC 0.7 string trace)', () => {
        const revert =
            `Error in the called contract (contract address: ${ACCOUNT}, class hash: 0x123, selector: ${EXECUTE}):\n` +
            'Error at pc=0:4835:\nCairo traceback (most recent call last):\nUnknown location (pc=0:67)\n\n' +
            `Error in the called contract (contract address: ${STRK}, class hash: 0x456, selector: ${TRANSFER}):\n` +
            `Execution failed. Failure reason: ${shortString.encodeShortString('u256_sub Overflow')} ('u256_sub Overflow').\n`;
        const p = parseStarknetError({ code: 40, message: 'Contract error', data: { revert_error: revert } }, { tokens: TOKENS });
        expect(p.code).toBe(40);
        expect(p.kind).toBe('insufficient_balance');
        expect(p.frames.map((f) => f.entrypoint)).toEqual(['__execute__', 'transfer']);
        expect(p.contractSymbol).toBe('STRK');
        expect(p.message).toBe("You don't have enough STRK for this transfer.");
    });

    it('treats u256_sub Overflow outside a token as arithmetic overflow', () => {
        const p = parseStarknetError({
            code: 40,
            message: 'Contract error',
            data: { revert_error: { contract_address: '0x999', selector: '0x1', error: '0x753235365f737562204f766572666c6f77' } },
        });
        expect(p.reason).toBe('u256_sub Overflow');
        expect(p.kind).toBe('arithmetic_overflow');
    });

    it('walks a nested RPC 0.8 execution_error object', () => {
        const data = {
            transaction_index: 0,
            execution_error: {
                contract_address: ACCOUNT,
                class_hash: '0xabc',
                selector: EXECUTE,
                error: {
                    contract_address: STRK,
                    class_hash: '0xdef',
                    selector: TRANSFER,
                    error: "(0x753235365f737562204f766572666c6f77 ('u256_sub Overflow'), 0x454e545259504f494e545f4641494c4544 ('ENTRYPOINT_FAILED'))",
                },
            },
        };
        const p = parseStarknetError({ jsonrpc: '2.0', id: 1, error: { code: 41, message: 'Transaction execution error', data } }, { tokens: TOKENS });
        expect(p.frames).toHaveLength(2);
        expect(p.frames[1]).toMatchObject({ contract: STRK, entrypoint: 'transfer', reason: 'u256_sub Overflow' });
        expect(p.kind).toBe('insufficient_balance');
        expect(p.message).toBe("You don't have enough STRK for this transfer.");
    });

    it('decodes un-annotated felts', () => {
        const felt = shortString.encodeShortString('ERC20: insufficient allowance');
        const p = parseStarknetError({ code: 41, message: 'x', data: { execution_error: { contract_address: ETH, selector: hash.getSelectorFromName('transfer_from'), error: `(${felt}, 0x454e545259504f494e545f4641494c4544)` } } }, { tokens: TOKENS });
        expect(p.reason).toBe('ERC20: insufficient allowance');
        expect(p.kind).toBe('insufficient_allowance');
        expect(p.message).toContain('ETH');
    });

    it('resolves selectors from an ABI', () => {
        const abi = [{ type: 'interface', name: 'IVault', items: [{ type: 'function', name: 'open_position', inputs: [], outputs: [] }] }];
        const p = parseStarknetError(
            { code: 40, message: 'Contract error', data: { revert_error: { contract_address: '0x77', selector: hash.getSelectorFromName('open_position'), error: "0x5661756c743a20706175736564 ('Vault: paused')" } } },
            { abi },
        );
        expect(p.entrypoint).toBe('open_position');
        expect(p.kind).toBe('unknown');
        expect(p.message).toBe('The contract returned an error: Vault: paused.');
    });

    it('falls back to a plain string', () => {
        const p = parseStarknetError('Something odd happened');
        expect(p.kind).toBe('unknown');
        expect(p.reason).toBe('Something odd happened');
        expect(p.message).toBe('The contract returned an error: Something odd happened.');
        expect(p.frames).toEqual([]);
    });

    it('classifies plain-string network and rejection errors', () => {
        expect(parseStarknetError('TypeError: Failed to fetch').kind).toBe('network');
        expect(parseStarknetError({ code: 4001, message: 'User rejected the request.' }).kind).toBe('user_rejected');
        expect(parseStarknetError({ code: 4100, message: 'Unauthorized' }).kind).toBe('permission_denied');
        expect(parseStarknetError(new Error('429 Too Many Requests')).kind).toBe('rate_limited');
    });

    it.each([
        [20, 'Contract not found', undefined, 'contract_not_found'],
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
    });

    it('detects invalid signatures from argent / OZ reasons', () => {
        expect(parseStarknetError({ code: 55, message: 'Account validation failed', data: "0x617267656e742f696e76616c69642d6f776e65722d736967 ('argent/invalid-owner-sig')" }).kind).toBe('invalid_signature');
        expect(parseStarknetError({ code: 55, message: 'Account validation failed', data: "Failure reason: 0x4163636f756e743a20696e76616c6964207369676e6174757265 ('Account: invalid signature')." }).kind).toBe('invalid_signature');
    });

    it('detects an undeployed account', () => {
        const err = new RpcError({ code: 20, message: 'Contract not found' } as never, 'starknet_estimateFee', estimateParams);
        expect(parseStarknetError(err).kind).toBe('account_not_deployed');
    });

    it('detects out of gas', () => {
        const p = parseStarknetError({ code: 41, message: 'x', data: { execution_error: { contract_address: ETH, selector: TRANSFER, error: "0x4f7574206f6620676173 ('Out of gas')" } } });
        expect(p.kind).toBe('out_of_gas');
        expect(p.retryable).toBe(true);
    });

    it('never emits em-dashes', () => {
        const samples: unknown[] = ['x', { code: 20 }, { code: 53 }, { code: 4001 }, 'Failed to fetch', { code: 41, data: { execution_error: 'boom' } }];
        for (const s of samples) expect(formatStarknetError(s)).not.toMatch(/—/);
    });
});
