/**
 * Keon Wallet SDK
 * 
 * A TypeScript SDK for integrating with Keon Wallet - a Starknet wallet extension.
 * 
 * @example
 * ```typescript
 * import { detectKeonWallet, connect, getAccount } from '@keon-wallet/sdk'
 * 
 * // Wait for wallet to be available
 * const wallet = await detectKeonWallet()
 * 
 * // Connect to wallet
 * const { address, chainId } = await connect()
 * 
 * // Get account for transactions
 * const account = getAccount()
 * await account.execute({ contractAddress: '0x...', entrypoint: 'transfer', calldata: [...] })
 * ```
 */

// Types
export type {
  // Wallet types
  KeonWallet,
  KeonAccount,
  KeonProvider,
  RequestMethod,
  WalletEvent,
  WalletRequest,
  EventHandler,
  NetworkInfo,
  SignatureResponse,
  TransactionResponse,
  DeclareResponse,
  DeployAccountResponse,
  DeployContractResponse,
  MultiDeployContractResponse,
  DeclareDeployResponse,
  EstimateFeeOptions,
  SimulateOptions,
  KeonMobileConnectorOptions,
  // Re-exported starknet types
  TypedData,
  Call,
  Signature,
  InvocationsDetails,
  DeclareContractPayload,
  DeployAccountContractPayload,
  BlockIdentifier,
} from './types'

// Errors
export {
  KeonWalletError,
  WalletNotFoundError,
  WalletNotConnectedError,
  UserRejectedError,
  RequestTimeoutError,
  RPC_ERROR_CODES,
  type RpcErrorCode,
} from './errors'

// Wallet utilities
export {
  // Detection
  isKeonWalletAvailable,
  getKeonWallet,
  tryGetKeonWallet,
  detectKeonWallet,
  type DetectWalletOptions,
  // Connection
  connect,
  disconnect,
  getConnectionState,
  type ConnectOptions,
  type ConnectionState,
  // Account & Provider
  getAccount,
  getProvider,
  getNetwork,
  switchNetwork,
  // Events
  subscribe,
  subscribeAll,
} from './wallet'
