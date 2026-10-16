// Classification tables.
//
// Revert reasons collected from real sources (see the test fixtures):
//   - OpenZeppelin Cairo: 'ERC20: insufficient balance', 'ERC20: insufficient allowance',
//     'ERC20: transfer to 0', 'ERC721: unauthorized caller', 'Caller is not the owner',
//     'Caller is missing role', 'Pausable: paused', 'ReentrancyGuard: reentrant call',
//     'Account: invalid signature', 'Account: invalid caller', 'Nonces: invalid nonce'
//   - Argent: 'argent/multicall-failed' + call index, 'argent/invalid-signature',
//     'argent/invalid-owner-sig', 'argent/invalid-guardian-sig', 'argent/max-fee-too-high',
//     'session/expired', 'session/revoked'
//   - Braavos: 'INVALID_SIG', 'INVALID_NONCE', 'MAX_FEE_TOO_HIGH', 'BAD_BALANCE', 'NOT_ALLOWED'
//   - Cairo corelib: 'u256_sub Overflow', 'u128_add Overflow', 'u64_mul Overflow',
//     'Option::unwrap failed.', 'Result::unwrap failed.', 'Division by 0', 'Index out of bounds'
//   - AVNU: 'Insufficient tokens received', 'Token from balance is too low', 'Unknown exchange'
//   - Ekubo: 'LIMIT_MAG', 'NOT_INITIALIZED', 'INSUFFICIENT_SAVED_BALANCE', 'TOKEN_TRANSFER_FAILED'
//   - Vesu: 'not-collateralized', 'dusty-debt-balance', 'utilization-exceeded', 'debt-cap-exceeded'

export type StarknetErrorKind =
    // contract reverts with a recognised reason
    | 'insufficient_balance'
    | 'insufficient_allowance'
    | 'slippage'
    | 'deadline_expired'
    | 'session_error'
    | 'invalid_signature'
    | 'invalid_nonce'
    | 'fee_rejected'
    | 'out_of_gas'
    | 'unauthorized_caller'
    | 'paused'
    | 'reentrancy'
    | 'lending_limit'
    | 'invalid_address'
    | 'route_unavailable'
    // Cairo core panics
    | 'arithmetic_overflow'
    | 'division_by_zero'
    | 'unwrap_failed'
    | 'index_out_of_bounds'
    // contract revert with a reason we don't interpret
    | 'contract_error'
    // RPC / node level
    | 'insufficient_max_fee'
    | 'insufficient_fee_balance'
    | 'contract_not_found'
    | 'entrypoint_not_found'
    | 'class_hash_not_found'
    | 'class_already_declared'
    | 'compiled_class_hash_mismatch'
    | 'validation_failure'
    | 'account_not_deployed'
    // wallet / transport
    | 'user_rejected'
    | 'permission_denied'
    | 'rate_limited'
    | 'network'
    | 'unknown';

/**
 * Every error kind the parser can report, as constants to compare against:
 *
 *   const e = parseStarknetError(err)
 *   if (e.errors.includes(StarknetErrors.CONTRACT_NOT_FOUND)) { ... }
 *   if (e.kind === StarknetErrors.INSUFFICIENT_BALANCE) { ... }
 *
 * The values are the `kind` strings, so both styles work.
 */
export const StarknetErrors = {
    INSUFFICIENT_BALANCE: 'insufficient_balance',
    INSUFFICIENT_ALLOWANCE: 'insufficient_allowance',
    SLIPPAGE: 'slippage',
    DEADLINE_EXPIRED: 'deadline_expired',
    SESSION_ERROR: 'session_error',
    INVALID_SIGNATURE: 'invalid_signature',
    INVALID_NONCE: 'invalid_nonce',
    FEE_REJECTED: 'fee_rejected',
    OUT_OF_GAS: 'out_of_gas',
    UNAUTHORIZED_CALLER: 'unauthorized_caller',
    PAUSED: 'paused',
    REENTRANCY: 'reentrancy',
    LENDING_LIMIT: 'lending_limit',
    INVALID_ADDRESS: 'invalid_address',
    ROUTE_UNAVAILABLE: 'route_unavailable',
    ARITHMETIC_OVERFLOW: 'arithmetic_overflow',
    DIVISION_BY_ZERO: 'division_by_zero',
    UNWRAP_FAILED: 'unwrap_failed',
    INDEX_OUT_OF_BOUNDS: 'index_out_of_bounds',
    CONTRACT_ERROR: 'contract_error',
    INSUFFICIENT_MAX_FEE: 'insufficient_max_fee',
    INSUFFICIENT_FEE_BALANCE: 'insufficient_fee_balance',
    CONTRACT_NOT_FOUND: 'contract_not_found',
    ENTRYPOINT_NOT_FOUND: 'entrypoint_not_found',
    CLASS_HASH_NOT_FOUND: 'class_hash_not_found',
    CLASS_ALREADY_DECLARED: 'class_already_declared',
    COMPILED_CLASS_HASH_MISMATCH: 'compiled_class_hash_mismatch',
    VALIDATION_FAILURE: 'validation_failure',
    ACCOUNT_NOT_DEPLOYED: 'account_not_deployed',
    USER_REJECTED: 'user_rejected',
    PERMISSION_DENIED: 'permission_denied',
    RATE_LIMITED: 'rate_limited',
    NETWORK: 'network',
    UNKNOWN: 'unknown',
} as const satisfies Record<string, StarknetErrorKind>;

/** All kinds, for menus, docs or exhaustive switches. */
export const STARKNET_ERROR_KINDS = Object.values(StarknetErrors) as StarknetErrorKind[];

export const PANIC_KINDS: ReadonlySet<StarknetErrorKind> = new Set([
    'arithmetic_overflow',
    'division_by_zero',
    'unwrap_failed',
    'index_out_of_bounds',
]);

export interface ReasonRule {
    kind: StarknetErrorKind;
    re: RegExp;
    /** For core panics: what happened, in plain English. */
    what?: string;
}

/** Ordered: the first match wins for a given reason string. */
export const REASON_RULES: ReasonRule[] = [
    { kind: 'entrypoint_not_found', re: /ENTRYPOINT_NOT_FOUND|requested entrypoint does not exist/i },
    { kind: 'contract_not_found', re: /requested contract address .* is not deployed|contract not found|CONTRACT_NOT_FOUND/i },
    { kind: 'insufficient_allowance', re: /insufficient allowance|exceeds allowance|allowance (?:is )?(?:too low|exceeded)/i },
    {
        kind: 'insufficient_balance',
        re: /insufficient balance|exceeds balance|balance (?:is )?too low|not enough balance|\bBAD_BALANCE\b|INSUFFICIENT_SAVED_BALANCE/i,
    },
    {
        kind: 'slippage',
        re: /insufficient tokens received|slippage|min(?:imum)?[ _-]?(?:amount[ _-]?)?(?:out(?:put)?|received)\b|too little received|insufficient[ _]output|\bLIMIT_MAG\b|price limit|max(?:imum)?[ _-]?input/i,
    },
    { kind: 'session_error', re: /^session\//i },
    {
        kind: 'invalid_signature',
        re: /invalid[-_ ]?(?:owner[-_ ]?|guardian[-_ ]?|txn[-_ ]?|aux[-_ ]?|permit[-_ ]?)?sig(?:nature)?(?:\b|[-_])|\bINVALID_SIG|missing-guardian-sig|malleable-signature|signature-invalid-length|expired permit signature|invalid-sig-not-owner|invalid-[rs]-value|wrong signature/i,
    },
    { kind: 'deadline_expired', re: /deadline|\bEXPIRED\b|transaction (?:has )?expired/i },
    { kind: 'invalid_nonce', re: /invalid (?:transaction )?nonce|\bINVALID_NONCE\b/i },
    { kind: 'fee_rejected', re: /max-fee-too-high|MAX_FEE_TOO_HIGH|MAX_FEE_EXCEEDS_EXPECTED|tip-too-high|\bINVALID_MAX_FEE\b|\bINVALID_FEE\b|\bMISSING_FEE\b/i },
    { kind: 'out_of_gas', re: /out of gas|ran out of gas/i },
    {
        kind: 'unauthorized_caller',
        re: /caller is not the (?:pending )?owner|caller is missing role|caller-not-|\bnot[-_ ]owner\b|only-(?:self|guardian)|\bOWNER_ONLY\b|\bCORE_ONLY\b|\bunauthori[sz]ed\b|invalid caller|\bINVALID_CALLER\b|\bNOT_ALLOWED\b|forbidden-call|not authori[sz]ed|access denied/i,
    },
    { kind: 'paused', re: /pausable: paused|\bpaused\b|emergency-mode/i },
    { kind: 'reentrancy', re: /reentran/i },
    {
        kind: 'lending_limit',
        re: /not-collateralized|less-than-min-collateral|dusty-(?:collateral|debt)-balance|utilization-exceeded|debt-cap-exceeded|insufficient collateral|undercollateral/i,
    },
    {
        kind: 'invalid_address',
        re: /(?:transfer|approve|mint|burn) (?:to|from) 0\b|zero address|invalid (?:receiver|recipient)|zero-pubkey/i,
    },
    { kind: 'route_unavailable', re: /pool not (?:found|initialized)|pair not initialized|unknown exchange|routes is empty|\bNO_LIQUIDITY\b|no route/i },
    { kind: 'arithmetic_overflow', re: /\b[ui](?:8|16|32|64|128|256)_sub Overflow\b/i, what: 'a number went below zero' },
    {
        kind: 'arithmetic_overflow',
        re: /\b[ui](?:8|16|32|64|128|256)_(?:add|mul) Overflow\b|\boverflow\b|\bOVF\b/i,
        what: 'a number got too large',
    },
    { kind: 'division_by_zero', re: /division by (?:0|zero)|div by zero/i, what: 'it divided by zero' },
    { kind: 'unwrap_failed', re: /(?:Option|Result)::(?:unwrap|expect|unwrap_err)\b.*failed/i, what: 'a required value was missing' },
    { kind: 'index_out_of_bounds', re: /out of bounds/i, what: 'an index was out of range' },
];

export function matchReason(reason: string): ReasonRule | undefined {
    return REASON_RULES.find((r) => r.re.test(reason));
}

export interface RpcRule {
    kind: StarknetErrorKind;
    codes: number[];
    /** Text match on the RPC message / raw text (used when no code is present). */
    re?: RegExp;
}

/** RPC / wallet codes. Codes 40, 41 and 55 carry contract reasons, so they are handled after reasons. */
export const CODE_RULES: RpcRule[] = [
    { kind: 'user_rejected', codes: [4001, 113], re: /user (?:rejected|refused|denied|aborted|cancel+ed)|rejected by (?:the )?user|user_refused_op|user abort/ },
    { kind: 'permission_denied', codes: [4100], re: /not authorized by the user|unauthorized origin/ },
    { kind: 'contract_not_found', codes: [20], re: /contract not found|requested contract address .* is not deployed|uninitialized contract/ },
    { kind: 'entrypoint_not_found', codes: [21], re: /entrypoint_not_found|entry ?point .*not found|requested entrypoint does not exist/ },
    { kind: 'class_hash_not_found', codes: [28], re: /class hash not found|class with hash .* is not declared|undeclaredclasshash/ },
    { kind: 'class_already_declared', codes: [51], re: /class (?:hash )?.*already declared|classalreadydeclared/ },
    { kind: 'invalid_nonce', codes: [52], re: /invalid (?:transaction )?nonce|nonce (?:is )?(?:too (?:low|high)|invalid)|invalidnonce/ },
    {
        kind: 'insufficient_max_fee',
        codes: [53],
        re: /insufficient max fee|max fee is (?:too low|smaller than)|insufficient resources|resources bounds .* (?:too low|insufficient)|actual fee exceeded max fee|max (?:l[12] )?(?:gas )?(?:amount|price) .* (?:lower|less) than/,
    },
    {
        kind: 'insufficient_fee_balance',
        codes: [54],
        re: /insufficient account balance|account balance is smaller than|fee.*exceeds? balance|resources bounds.*exceed balance|not enough .* to pay (?:the )?fee/,
    },
    { kind: 'compiled_class_hash_mismatch', codes: [60], re: /compiled class hash mismatch|mismatch.*compiled class hash|compiled class hash did not match/ },
    { kind: 'validation_failure', codes: [55], re: /validation failure|account validation failed|validate (?:has )?failed/ },
    { kind: 'out_of_gas', codes: [], re: /out of gas|ran out of gas|run out of resources|gas limit exceeded/ },
    { kind: 'rate_limited', codes: [429], re: /rate limit|too many requests|\b429\b|request limit/ },
    {
        kind: 'network',
        codes: [],
        re: /failed to fetch|fetch failed|network ?error|networkerror|econnrefused|econnreset|etimedout|enotfound|socket hang up|timed? ?out|\b50[234]\b|bad gateway|service unavailable|load failed/,
    },
];

export const RETRYABLE: ReadonlySet<StarknetErrorKind> = new Set([
    'slippage',
    'deadline_expired',
    'invalid_nonce',
    'fee_rejected',
    'out_of_gas',
    'paused',
    'insufficient_max_fee',
    'user_rejected',
    'rate_limited',
    'network',
]);

export const TITLES: Record<StarknetErrorKind, string> = {
    insufficient_balance: 'Insufficient balance',
    insufficient_allowance: 'Allowance too low',
    slippage: 'Price moved',
    deadline_expired: 'Deadline passed',
    session_error: 'Session key rejected',
    invalid_signature: 'Invalid signature',
    invalid_nonce: 'Transaction out of order',
    fee_rejected: 'Fee rejected by account',
    out_of_gas: 'Out of gas',
    unauthorized_caller: 'Not allowed',
    paused: 'Contract paused',
    reentrancy: 'Reentrant call blocked',
    lending_limit: 'Position limit reached',
    invalid_address: 'Invalid address',
    route_unavailable: 'No route available',
    arithmetic_overflow: 'Contract calculation failed',
    division_by_zero: 'Contract calculation failed',
    unwrap_failed: 'Contract call failed',
    index_out_of_bounds: 'Contract call failed',
    contract_error: 'Contract call failed',
    insufficient_max_fee: 'Fee too low',
    insufficient_fee_balance: 'Not enough for fees',
    contract_not_found: 'Contract not found',
    entrypoint_not_found: 'Function not found',
    class_hash_not_found: 'Class not declared',
    class_already_declared: 'Class already declared',
    compiled_class_hash_mismatch: 'Compiled class hash mismatch',
    validation_failure: 'Validation failed',
    account_not_deployed: 'Account not deployed',
    user_rejected: 'Request rejected',
    permission_denied: 'Permission denied',
    rate_limited: 'Too many requests',
    network: 'Network problem',
    unknown: 'Transaction failed',
};

export interface MessageCtx {
    symbol?: string;
    entrypoint?: string;
    reason?: string;
    rpcMessage?: string;
}

export function actionPhrase(entrypoint?: string): string {
    const e = (entrypoint ?? '').toLowerCase();
    if (/transfer/.test(e)) return 'this transfer';
    if (/approve|allowance/.test(e)) return 'this approval';
    if (/swap/.test(e)) return 'this swap';
    if (/deposit|supply|add_liquidity|^stake/.test(e)) return 'this deposit';
    if (/withdraw|remove_liquidity|unstake/.test(e)) return 'this withdrawal';
    if (/repay/.test(e)) return 'this repayment';
    return 'this transaction';
}

/** The plain-English lead sentence and hint for each kind. */
export function leadFor(kind: StarknetErrorKind, c: MessageCtx): { lead: string; hint?: string } {
    const token = c.symbol ?? 'tokens';
    const action = actionPhrase(c.entrypoint);
    switch (kind) {
        case 'insufficient_balance':
            return { lead: `You don't have enough ${token} for ${action}.`, hint: 'Lower the amount or add funds, then try again.' };
        case 'insufficient_allowance':
            return { lead: `The spender is not approved for enough ${token} for ${action}.`, hint: 'Approve a larger amount and try again.' };
        case 'slippage':
            return { lead: 'The price moved more than your slippage tolerance allows.', hint: 'Refresh the quote or raise the slippage tolerance.' };
        case 'deadline_expired':
            return { lead: 'The deadline for this transaction passed before it ran.', hint: 'Get a fresh quote and try again.' };
        case 'session_error':
            return { lead: 'The session key is expired, revoked or not allowed to make this call.', hint: 'Approve a new session and try again.' };
        case 'invalid_signature':
            return { lead: 'The account rejected the transaction signature.', hint: 'Make sure the right account and signer are selected, then sign again.' };
        case 'invalid_nonce':
            return { lead: 'The account nonce changed, usually because another transaction from this account went through first.', hint: 'Wait a moment and try again.' };
        case 'fee_rejected':
            return { lead: 'The account rejected the fee settings for this transaction.', hint: 'Estimate the fee again and resubmit.' };
        case 'out_of_gas':
            return { lead: 'The transaction ran out of gas before it finished.', hint: 'Estimate the fee again and resubmit.' };
        case 'unauthorized_caller':
            return { lead: 'Your account is not allowed to call this function.' };
        case 'paused':
            return { lead: 'The contract is paused right now.', hint: 'Try again later.' };
        case 'reentrancy':
            return { lead: 'The contract blocked a reentrant call.' };
        case 'lending_limit':
            return { lead: 'The lending protocol rejected this change to your position.', hint: 'Adjust the amount or add collateral, then try again.' };
        case 'invalid_address':
            return { lead: 'An address in this request is zero or invalid.', hint: 'Check the recipient address.' };
        case 'route_unavailable':
            return { lead: 'No pool or route is available for this trade.', hint: 'Try a different pair or amount.' };
        case 'insufficient_max_fee':
            return { lead: 'The fee limit set for this transaction is lower than what the network needs right now.', hint: 'Estimate the fee again and resubmit.' };
        case 'insufficient_fee_balance':
            return { lead: "Your account doesn't have enough STRK or ETH to pay the network fee.", hint: 'Add funds for gas, then try again.' };
        case 'contract_not_found':
            return { lead: 'The contract this request calls does not exist on this network.', hint: 'Check the address and that you are on the right network.' };
        case 'entrypoint_not_found':
            return { lead: `The contract does not have the function${c.entrypoint ? ` "${c.entrypoint}"` : ''} this request calls.` };
        case 'class_hash_not_found':
            return { lead: 'The contract class hash was not found on this network.', hint: 'Check you are on the right network, or declare the class first.' };
        case 'class_already_declared':
            return { lead: 'This contract class is already declared on the network.', hint: 'Skip the declare step and deploy using the existing class hash.' };
        case 'compiled_class_hash_mismatch':
            return { lead: 'The compiled class hash does not match the one the network computed.', hint: 'Recompile with the compiler version the network expects and declare again.' };
        case 'validation_failure':
            return { lead: 'The account rejected this transaction during validation.', hint: 'Check the account, signer and fee settings, then try again.' };
        case 'account_not_deployed':
            return { lead: 'This account has not been deployed on Starknet yet.', hint: 'Deploy the account first (it usually happens with your first transaction), then try again.' };
        case 'user_rejected':
            return { lead: 'You rejected the request in your wallet.' };
        case 'permission_denied':
            return { lead: 'This site is not allowed to use your wallet for this request.', hint: 'Connect the wallet to this site and try again.' };
        case 'rate_limited':
            return { lead: 'The network node is rate limiting requests right now.', hint: 'Wait a few seconds and try again.' };
        case 'network':
            return { lead: 'Could not reach the Starknet node.', hint: 'Check your connection and try again.' };
        default:
            return { lead: '' };
    }
}
