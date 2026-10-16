/**
 * Error classes for Keon Wallet SDK
 */

/**
 * Base error class for Keon Wallet errors
 */
export class KeonWalletError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KeonWalletError'
  }
}

/**
 * Error thrown when wallet is not installed
 */
export class WalletNotFoundError extends KeonWalletError {
  constructor() {
    super('Keon Wallet not found. Please install the extension.')
    this.name = 'WalletNotFoundError'
  }
}

/**
 * Error thrown when wallet is not connected
 */
export class WalletNotConnectedError extends KeonWalletError {
  constructor() {
    super('Wallet is not connected. Call connect() first.')
    this.name = 'WalletNotConnectedError'
  }
}

/**
 * Error thrown when user rejects a request
 */
export class UserRejectedError extends KeonWalletError {
  constructor(action: string = 'request') {
    super(`User rejected the ${action}`)
    this.name = 'UserRejectedError'
  }
}

/**
 * Error thrown when a request times out
 */
export class RequestTimeoutError extends KeonWalletError {
  constructor(method: string) {
    super(`Request timed out: ${method}`)
    this.name = 'RequestTimeoutError'
  }
}

/**
 * RPC error codes
 */
export const RPC_ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  INTERNAL_ERROR: -32603,
  INVALID_PARAMS: -32602,
  METHOD_NOT_FOUND: -32601,
} as const

export type RpcErrorCode = (typeof RPC_ERROR_CODES)[keyof typeof RPC_ERROR_CODES]
