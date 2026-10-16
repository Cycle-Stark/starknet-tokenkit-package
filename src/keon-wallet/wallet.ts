/**
 * Keon Wallet detection and connection utilities
 */

import type { KeonWallet, WalletEvent, EventHandler, NetworkInfo } from './types'
import { WalletNotFoundError, WalletNotConnectedError } from './errors'

/**
 * Options for wallet detection
 */
export interface DetectWalletOptions {
  /** Timeout in milliseconds (default: 3000) */
  timeout?: number
  /** Polling interval in milliseconds (default: 100) */
  interval?: number
}

/**
 * Check if Keon Wallet is available
 */
export function isKeonWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.starknet_keon
}

/**
 * Get Keon Wallet instance if available
 * @throws {WalletNotFoundError} if wallet is not installed
 */
export function getKeonWallet(): KeonWallet {
  if (!isKeonWalletAvailable()) {
    throw new WalletNotFoundError()
  }
  return window.starknet_keon!
}

/**
 * Try to get Keon Wallet instance, returns undefined if not available
 */
export function tryGetKeonWallet(): KeonWallet | undefined {
  return window.starknet_keon
}

/**
 * Wait for Keon Wallet to be available
 * Useful when the page loads before the extension injects the wallet
 */
export function detectKeonWallet(options: DetectWalletOptions = {}): Promise<KeonWallet> {
  const { timeout = 3000, interval = 100 } = options

  return new Promise((resolve, reject) => {
    // Check immediately
    if (isKeonWalletAvailable()) {
      resolve(window.starknet_keon!)
      return
    }

    const startTime = Date.now()

    // Listen for wallet announcement event
    const handleAnnouncement = (event: CustomEvent) => {
      if (event.detail?.id === 'keon') {
        cleanup()
        if (window.starknet_keon) {
          resolve(window.starknet_keon)
        }
      }
    }

    window.addEventListener('wallet_announced', handleAnnouncement as EventListener)

    // Poll for wallet
    const pollInterval = setInterval(() => {
      if (isKeonWalletAvailable()) {
        cleanup()
        resolve(window.starknet_keon!)
        return
      }

      if (Date.now() - startTime >= timeout) {
        cleanup()
        reject(new WalletNotFoundError())
      }
    }, interval)

    function cleanup() {
      clearInterval(pollInterval)
      window.removeEventListener('wallet_announced', handleAnnouncement as EventListener)
    }
  })
}

/**
 * Connection state
 */
export interface ConnectionState {
  isConnected: boolean
  address: string | null
  chainId: string | null
}

/**
 * Options for connecting to wallet
 */
export interface ConnectOptions {
  /** Auto-detect wallet if not immediately available */
  autoDetect?: boolean
  /** Detection timeout in milliseconds */
  detectTimeout?: number
}

/**
 * Connect to Keon Wallet
 * @returns Connection state with address and chainId
 */
export async function connect(options: ConnectOptions = {}): Promise<ConnectionState> {
  const { autoDetect = true, detectTimeout = 3000 } = options

  let wallet: KeonWallet

  if (autoDetect) {
    wallet = await detectKeonWallet({ timeout: detectTimeout })
  } else {
    wallet = getKeonWallet()
  }

  const accounts = await wallet.enable()

  if (accounts.length === 0) {
    return { isConnected: false, address: null, chainId: null }
  }

  const chainId = wallet.chainId || (await wallet.request<string>({ type: 'wallet_requestChainId' }))

  return {
    isConnected: true,
    address: accounts[0],
    chainId,
  }
}

/**
 * Disconnect from wallet (clears local state, doesn't revoke permissions)
 */
export function disconnect(): void {
  // Note: There's no standard disconnect method in Starknet wallets
  // This is a local operation only
}

/**
 * Get current connection state
 */
export function getConnectionState(): ConnectionState {
  const wallet = tryGetKeonWallet()

  if (!wallet) {
    return { isConnected: false, address: null, chainId: null }
  }

  return {
    isConnected: wallet.isConnected,
    address: wallet.selectedAddress || null,
    chainId: wallet.chainId || null,
  }
}

/**
 * Get the connected account, throws if not connected
 */
export function getAccount() {
  const wallet = getKeonWallet()

  if (!wallet.isConnected || !wallet.account) {
    throw new WalletNotConnectedError()
  }

  return wallet.account
}

/**
 * Get the provider for read-only operations
 */
export function getProvider() {
  const wallet = getKeonWallet()
  return wallet.provider
}

/**
 * Get active network information
 */
export async function getNetwork(): Promise<NetworkInfo> {
  const wallet = getKeonWallet()
  return wallet.request<NetworkInfo>({ type: 'wallet_getActiveNetwork' })
}

/**
 * Switch to a different network
 */
export async function switchNetwork(chainId: string): Promise<boolean> {
  const wallet = getKeonWallet()
  return wallet.request<boolean>({
    type: 'wallet_switchStarknetChain',
    params: { chainId },
  })
}

/**
 * Subscribe to wallet events with automatic cleanup
 * @returns Cleanup function to unsubscribe
 */
export function subscribe<T = unknown>(
  event: WalletEvent,
  handler: EventHandler<T>
): () => void {
  const wallet = tryGetKeonWallet()

  if (!wallet) {
    console.warn('Keon Wallet not available, event subscription ignored')
    return () => {}
  }

  wallet.on(event, handler as EventHandler)

  return () => {
    wallet.off(event, handler as EventHandler)
  }
}

/**
 * Subscribe to multiple events at once
 * @returns Cleanup function to unsubscribe from all events
 */
export function subscribeAll(
  handlers: Partial<Record<WalletEvent, EventHandler>>
): () => void {
  const cleanups: (() => void)[] = []

  for (const [event, handler] of Object.entries(handlers)) {
    if (handler) {
      cleanups.push(subscribe(event as WalletEvent, handler))
    }
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup())
  }
}
