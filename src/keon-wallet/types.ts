/**
 * Type definitions for Keon Wallet
 */

import type {
  TypedData,
  Call,
  Signature,
  InvocationsDetails,
  DeclareContractPayload,
  DeployAccountContractPayload,
  UniversalDeployerContractPayload,
  DeclareAndDeployContractPayload,
  BlockIdentifier,
} from 'starknet'

// Re-export starknet types that are commonly used
export type {
  TypedData,
  Call,
  Signature,
  InvocationsDetails,
  DeclareContractPayload,
  DeployAccountContractPayload,
  UniversalDeployerContractPayload,
  DeclareAndDeployContractPayload,
  BlockIdentifier,
}

/**
 * Options for fee estimation
 */
export interface EstimateFeeOptions {
  blockIdentifier?: BlockIdentifier
  skipValidate?: boolean
}

/**
 * Options for transaction simulation
 */
export interface SimulateOptions {
  blockIdentifier?: BlockIdentifier
  skipValidate?: boolean
  skipFeeCharge?: boolean
}

/**
 * Request methods supported by Keon Wallet
 */
export type RequestMethod =
  // Wallet methods
  | 'wallet_requestAccounts'
  | 'wallet_disconnect'
  | 'wallet_getPermissions'
  | 'wallet_requestChainId'
  | 'wallet_getActiveNetwork'
  | 'wallet_switchStarknetChain'
  | 'wallet_watchAsset'
  | 'wallet_addStarknetChain'
  | 'wallet_addInvokeTransaction'
  | 'wallet_addDeclareTransaction'
  | 'wallet_addDeployAccountTransaction'
  | 'wallet_signTypedData'
  // Transaction methods
  | 'starknet_addInvokeTransaction'
  | 'starknet_addDeclareTransaction'
  | 'starknet_addDeployAccountTransaction'
  | 'starknet_signTypedData'
  | 'starknet_supportedSpecs'
  // Deploy methods
  | 'starknet_deployContract'
  | 'starknet_declareAndDeploy'
  // SNIP-9 Outside Execution
  | 'starknet_executeFromOutside'
  // Read-only methods
  | 'starknet_estimateFee'
  | 'starknet_simulateTransaction'
  | 'starknet_call'
  | 'starknet_getClassAt'
  | 'starknet_getClassHashAt'
  | 'starknet_getNonce'
  | 'starknet_getTransactionReceipt'
  | 'starknet_verifyMessage'

/**
 * Events emitted by Keon Wallet
 */
export type WalletEvent =
  | 'accountsChanged'
  | 'networkChanged'
  | 'chainChanged'
  | 'connect'
  | 'disconnect'
  | 'wallet_disconnect'

/**
 * Network information returned by wallet_getActiveNetwork
 */
export interface NetworkInfo {
  id: string
  name: string
  chainId: string
  rpcUrl: string
}

/**
 * Signature with r, s components
 */
export interface SignatureResponse {
  r: string
  s: string
  recovery?: number
}

/**
 * Transaction response
 */
export interface TransactionResponse {
  transaction_hash: string
}

/**
 * Declare transaction response
 */
export interface DeclareResponse {
  transaction_hash: string
  class_hash: string
}

/**
 * Deploy account transaction response
 */
export interface DeployAccountResponse {
  transaction_hash: string
  contract_address: string
}

/**
 * Deploy contract response (UDC)
 */
export interface DeployContractResponse {
  contract_address: string
  transaction_hash: string
  address: string
}

/**
 * Multi deploy contract response
 */
export interface MultiDeployContractResponse {
  contract_address: string[]
  transaction_hash: string
}

/**
 * Declare and deploy response
 */
export interface DeclareDeployResponse {
  declare: {
    class_hash: string
    transaction_hash?: string
  }
  deploy: DeployContractResponse
}

/**
 * Request call structure
 */
export interface WalletRequest<T = unknown> {
  type: RequestMethod
  params?: T
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void

/**
 * Provider interface for read-only operations
 */
export interface KeonProvider {
  getChainId(): Promise<string>
  callContract(call: Call, blockIdentifier?: BlockIdentifier): Promise<unknown>
  getNonceForAddress(address: string, blockIdentifier?: BlockIdentifier): Promise<string>
  getClassAt(contractAddress: string, blockIdentifier?: BlockIdentifier): Promise<unknown>
  getClassHashAt(contractAddress: string, blockIdentifier?: BlockIdentifier): Promise<string>
  getTransactionReceipt(transactionHash: string): Promise<unknown>
  getNetwork(): Promise<NetworkInfo>
}

/**
 * Account interface for transaction operations
 */
export interface KeonAccount {
  address: string
  getChainId(): Promise<string>

  // Transaction methods
  execute(calls: Call | Call[], abisOrDetails?: unknown, details?: InvocationsDetails): Promise<TransactionResponse>
  signMessage(typedData: TypedData): Promise<Signature>

  // Declare methods
  declare(payload: DeclareContractPayload, details?: InvocationsDetails): Promise<DeclareResponse>
  declareIfNot(payload: DeclareContractPayload, details?: InvocationsDetails): Promise<DeclareResponse>

  // Deploy methods (UDC)
  deploy(payload: UniversalDeployerContractPayload | UniversalDeployerContractPayload[], details?: InvocationsDetails): Promise<MultiDeployContractResponse>
  deployContract(payload: UniversalDeployerContractPayload | UniversalDeployerContractPayload[], details?: InvocationsDetails): Promise<DeployContractResponse>
  declareAndDeploy(payload: DeclareAndDeployContractPayload, details?: InvocationsDetails): Promise<DeclareDeployResponse>

  // Deploy account
  deployAccount(payload: DeployAccountContractPayload, details?: InvocationsDetails): Promise<DeployAccountResponse>

  // Fee estimation
  estimateInvokeFee(calls: Call | Call[], details?: EstimateFeeOptions): Promise<unknown>
  estimateDeclareFee(payload: DeclareContractPayload, details?: EstimateFeeOptions): Promise<unknown>
  estimateDeployFee(payload: UniversalDeployerContractPayload | UniversalDeployerContractPayload[], details?: EstimateFeeOptions): Promise<unknown>
  estimateAccountDeployFee(payload: DeployAccountContractPayload, details?: EstimateFeeOptions): Promise<unknown>
  estimateFeeBulk(invocations: unknown, details?: EstimateFeeOptions): Promise<unknown>

  // Simulation
  simulateTransaction(invocations: unknown, details?: SimulateOptions): Promise<unknown>

  // Read methods
  getNonce(blockIdentifier?: BlockIdentifier): Promise<string>
  callContract(call: Call, blockIdentifier?: BlockIdentifier): Promise<unknown>
  getClassAt(contractAddress: string, blockIdentifier?: BlockIdentifier): Promise<unknown>
  getClassHashAt(contractAddress: string, blockIdentifier?: BlockIdentifier): Promise<string>
  getTransactionReceipt(transactionHash: string): Promise<unknown>
  verifyMessage(typedData: TypedData, signature: Signature): Promise<boolean>
}

/**
 * Main Keon Wallet window object interface
 */
export interface KeonWallet {
  /** Wallet identifier */
  id: string
  /** Wallet display name */
  name: string
  /** Wallet version */
  version: string
  /** Wallet icon URL */
  icon: string
  /** Whether the wallet is connected to the current dApp */
  isConnected: boolean
  /** Currently selected account address (if connected) */
  selectedAddress?: string
  /** Current chain ID */
  chainId?: string
  /** Account object for transactions (available after connection) */
  account?: KeonAccount
  /** Provider for read-only operations */
  provider?: KeonProvider

  /**
   * Make a request to the wallet
   */
  request<T = unknown>(call: WalletRequest): Promise<T>

  /**
   * Connect to the wallet (alias for wallet_requestAccounts)
   * @returns Array of connected account addresses
   */
  enable(): Promise<string[]>

  /**
   * Check if the dApp is already authorized
   */
  isPreauthorized(): Promise<boolean>

  /**
   * Subscribe to wallet events
   */
  on<T = unknown>(event: WalletEvent, handler: EventHandler<T>): void

  /**
   * Unsubscribe from wallet events
   */
  off<T = unknown>(event: WalletEvent, handler: EventHandler<T>): void
}

/**
 * Options for KeonMobileConnector
 */
export interface KeonMobileConnectorOptions {
  /** dApp display name shown in the wallet */
  dappName: string
  /** WalletConnect project ID (get one from cloud.walletconnect.com) */
  projectId?: string
  /** Starknet chain ID ('SN_MAIN' or 'SN_SEPOLIA') */
  chainId?: string
  /** dApp description */
  description?: string
  /** dApp URL (used for session metadata) */
  url: string
  /** dApp icon URLs */
  icons?: string[]
  /** Custom RPC URL for provider */
  rpcUrl?: string
  /**
   * Called when the WalletConnect pairing URI is available.
   * Use this to display a QR code or provide a copy-paste URI to the user.
   */
  onDisplayUri?: (uri: string) => void
}

/**
 * Extend Window interface to include Keon Wallet
 */
declare global {
  interface Window {
    starknet_keon?: KeonWallet
  }
}
