/**
 * KeonMobileConnector
 *
 * Static factory that returns the right connector based on environment:
 * - In Keon's in-app browser → InjectedConnector (window.starknet_keon)
 * - Outside → KeonMobileBaseConnector (WalletConnect v2)
 *
 * Usage:
 * ```typescript
 * import { KeonMobileConnector } from '@keon-wallet/sdk/mobile'
 *
 * const connector = KeonMobileConnector.init({
 *   options: {
 *     dappName: 'My dApp',
 *     url: window.location.hostname,
 *     projectId: 'YOUR_WC_PROJECT_ID',
 *   },
 * })
 * ```
 */

import { InjectedConnector } from 'starknetkit/injected'
import { KeonMobileBaseConnector } from './connector'
import type { KeonMobileConnectorOptions } from '../types'

export interface KeonMobileConnectorInitParams {
  options: KeonMobileConnectorOptions
  inAppBrowserOptions?: {
    /** Override wallet id for in-app detection */
    id?: string
    /** Override wallet name */
    name?: string
  }
}

/**
 * Detect if running inside Keon Wallet's in-app browser.
 * The in-app browser injects window.starknet_keon automatically.
 */
export function isInKeonMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keon = (window as any).starknet_keon as { id?: string } | undefined
  return !!(keon && keon.id === 'keon')
}

export class KeonMobileConnector {
  /**
   * Initialize the Keon Mobile connector.
   * Returns InjectedConnector if in Keon's in-app browser,
   * otherwise returns KeonMobileBaseConnector (WalletConnect v2).
   */
  static init({ options, inAppBrowserOptions }: KeonMobileConnectorInitParams): InjectedConnector | KeonMobileBaseConnector {
    if (isInKeonMobileBrowser()) {
      return new InjectedConnector({
        options: {
          id: inAppBrowserOptions?.id || 'keon',
          name: inAppBrowserOptions?.name || 'Keon Wallet',
        },
      })
    }

    return new KeonMobileBaseConnector(options)
  }
}

// Re-export types and classes
export type { KeonMobileConnectorOptions }
export { KeonMobileBaseConnector }
