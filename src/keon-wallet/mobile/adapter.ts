/**
 * WalletConnect → StarknetWindowObject Adapter
 *
 * Wraps a WalletConnect SignClient + active session to conform to the
 * StarknetWindowObject interface. This lets starknetkit treat a WC
 * connection exactly like an injected browser wallet.
 */

import type SignClient from '@walletconnect/sign-client'
import type { SessionTypes } from '@walletconnect/types'
import type { StarknetWindowObject } from '@starknet-io/types-js'

// Map wallet-api method names to WC method names
const METHOD_MAP: Record<string, string> = {
  'wallet_addInvokeTransaction': 'starknet_requestAddInvokeTransaction',
  'wallet_addDeclareTransaction': 'starknet_requestAddDeclareTransaction',
  'wallet_addDeployAccountTransaction': 'starknet_requestAddDeployAccountTransaction',
  'wallet_signTypedData': 'starknet_signTypedData',
  'wallet_supportedSpecs': 'wallet_supportedSpecs',
  'wallet_requestChainId': 'starknet_chainId',
}

export interface WCAdapterOptions {
  client: InstanceType<typeof SignClient>
  session: SessionTypes.Struct
  chainId: string
  address: string
}

type EventCallback = (...args: unknown[]) => void

export function createWCStarknetWindowObject(opts: WCAdapterOptions): StarknetWindowObject {
  const { client, session, chainId, address } = opts
  const listeners = new Map<string, Set<EventCallback>>()

  // Listen for WC session events and forward them
  client.on('session_event', (event: { topic: string; params: { event: { name: string; data: unknown } } }) => {
    if (event.topic !== session.topic) return
    const { name, data } = event.params.event
    const fns = listeners.get(name)
    if (fns) fns.forEach(fn => fn(data))
  })

  client.on('session_delete', (event: { topic: string }) => {
    if (event.topic !== session.topic) return
    const fns = listeners.get('accountsChanged')
    if (fns) fns.forEach(fn => fn([]))
  })

  const wcChainId = `starknet:${chainId}`

  const swo: StarknetWindowObject = {
    id: 'keon',
    name: 'Keon Wallet',
    version: '0.2.0',
    icon: {
      dark: 'https://tokenkit.s3.amazonaws.com/keon-dark-icon_cfffbcb7b64640d79ed6df525af9965c.png',
      light: 'https://tokenkit.s3.amazonaws.com/keon-light-icon_996d2d361e4c4d3388b8de3af2321404.png',
    },

    request: (async (call: { type: string; params?: unknown }): Promise<unknown> => {
      const wcMethod = METHOD_MAP[call.type] || call.type

      // Handle wallet_requestAccounts locally
      if (call.type === 'wallet_requestAccounts') {
        return [address]
      }

      // Handle wallet_requestChainId locally
      if (call.type === 'wallet_requestChainId') {
        return chainId
      }

      // Forward to wallet via WC
      return client.request({
        topic: session.topic,
        chainId: wcChainId,
        request: {
          method: wcMethod,
          params: call.params ?? {},
        },
      })
    }) as StarknetWindowObject['request'],

    on: ((event: string, handler: EventCallback) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    }) as StarknetWindowObject['on'],

    off: ((event: string, handler: EventCallback) => {
      listeners.get(event)?.delete(handler)
    }) as StarknetWindowObject['off'],
  }

  return swo
}
