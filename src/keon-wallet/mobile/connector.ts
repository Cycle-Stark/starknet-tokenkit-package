/**
 * KeonMobileBaseConnector
 *
 * Implements starknetkit's Connector interface. Used when NOT inside Keon's
 * in-app browser. Creates a WalletConnect v2 session, provides URI for QR
 * code or deep link, and proxies all methods through the WC session.
 */

import SignClient from '@walletconnect/sign-client'
import type { SessionTypes } from '@walletconnect/types'
import type { StarknetWindowObject, RequestFnCall, RpcMessage, RpcTypeToMessageMap } from '@starknet-io/types-js'
import { Account, RpcProvider } from 'starknet'
import type {
  AccountInterface,
  ProviderInterface,
  ProviderOptions,
  BigNumberish,
  Signature,
  TypedData,
  DeclareContractPayload,
  UniversalDetails,
  DeclareContractResponse,
  DeployAccountContractPayload,
  DeployContractResponse,
} from 'starknet'
import EventEmitter from 'eventemitter3'
import type { KeonMobileConnectorOptions } from '../types'
import { createWCStarknetWindowObject } from './adapter'

const DEFAULT_PROJECT_ID = '9ed78593f9e1f84e3151ea58cfeea38b'

const STARKNET_CHAINS = ['starknet:SN_MAIN', 'starknet:SN_SEPOLIA']

const STARKNET_METHODS = [
  'starknet_requestAddInvokeTransaction',
  'starknet_signTypedData',
  'starknet_requestAddDeclareTransaction',
  'starknet_requestAddDeployAccountTransaction',
  'starknet_call',
  'starknet_chainId',
  'starknet_getNonce',
  'starknet_getTransactionReceipt',
  'starknet_getClassAt',
  'starknet_getClassHashAt',
  'starknet_estimateFee',
  'starknet_estimateInvokeFee',
  'starknet_simulateTransaction',
  'starknet_verifyMessage',
  'starknet_declareIfNot',
  'starknet_deployContract',
  'wallet_supportedSpecs',
  'wallet_requestChainId',
  'wallet_getPermissions',
  'wallet_getActiveNetwork',
]

const STARKNET_EVENTS = ['accountsChanged', 'networkChanged']

const CHAIN_ID_MAP: Record<string, string> = {
  'SN_MAIN': '0x534e5f4d41494e',
  'SN_SEPOLIA': '0x534e5f5345504f4c4941',
}

// Connector event types matching starknetkit's ConnectorEvents
interface ConnectorEvents {
  change: [data: { account?: string; chainId?: bigint }]
  connect: [data: { account?: string; chainId?: bigint }]
  disconnect: []
  connectionStatus: [s: 'init' | 'success' | 'fail' | 'fallback']
}

/**
 * Implements the starknetkit Connector interface using WalletConnect v2.
 * Since starknetkit only exports Connector as a type (not a runtime class),
 * we implement the full interface via EventEmitter.
 */
export class KeonMobileBaseConnector extends EventEmitter<ConnectorEvents> {
  private _wallet: StarknetWindowObject | null = null
  private _client: InstanceType<typeof SignClient> | null = null
  private _session: SessionTypes.Struct | null = null
  private _address: string | null = null
  private _chainId: string
  private readonly _options: KeonMobileConnectorOptions

  constructor(options: KeonMobileConnectorOptions) {
    super()
    this._options = options
    this._chainId = options.chainId || 'SN_SEPOLIA'
  }

  get id(): string { return 'keon' }
  get name(): string { return 'Keon' }

  get icon(): StarknetWindowObject['icon'] {
    return {
      dark: 'https://tokenkit.s3.amazonaws.com/keon-dark-icon_cfffbcb7b64640d79ed6df525af9965c.png',
      light: 'https://tokenkit.s3.amazonaws.com/keon-light-icon_996d2d361e4c4d3388b8de3af2321404.png',
    }
  }

  get wallet(): StarknetWindowObject {
    if (!this._wallet) throw new Error('Not connected')
    return this._wallet
  }

  available(): boolean { return true }

  async ready(): Promise<boolean> {
    return this._session !== null
  }

  async connect(_args?: { chainIdHint?: bigint; onlyQRCode?: boolean }): Promise<{ account?: string; chainId?: bigint }> {
    const projectId = this._options.projectId || DEFAULT_PROJECT_ID

    console.log('[KeonMobile] Initializing SignClient with projectId:', projectId.substring(0, 8) + '...')

    try {
      this._client = await SignClient.init({
        projectId,
        metadata: {
          name: this._options.dappName,
          description: this._options.description || '',
          url: this._options.url || (typeof window !== 'undefined' ? window.location.origin : ''),
          icons: this._options.icons || [],
        },
      })
    } catch (err) {
      console.error('[KeonMobile] SignClient.init() failed:', err)
      throw new Error(`WalletConnect initialization failed: ${err instanceof Error ? err.message : String(err)}`)
    }

    console.log('[KeonMobile] SignClient initialized, creating pairing...')

    const { uri, approval } = await this._client.connect({
      requiredNamespaces: {
        starknet: {
          chains: STARKNET_CHAINS,
          methods: STARKNET_METHODS,
          events: STARKNET_EVENTS,
        },
      },
    })

    console.log('[KeonMobile] Pairing created, URI:', uri ? uri.substring(0, 30) + '...' : 'none')

    if (uri) {
      // Notify the dApp so it can display a QR code and/or deep link button.
      // The dApp is responsible for showing a tappable link to the user.
      // We do NOT auto-redirect — programmatic navigation breaks on most mobile browsers.
      this._options.onDisplayUri?.(uri)
      this.emit('connectionStatus', 'init')
    }

    console.log('[KeonMobile] Waiting for wallet approval...')

    // Wait for wallet to approve
    this._session = await approval()

    // Extract address from session namespaces
    const starknetNs = this._session.namespaces['starknet']
    if (starknetNs?.accounts?.length) {
      // Format: starknet:SN_SEPOLIA:0x1234...
      const parts = starknetNs.accounts[0].split(':')
      this._address = parts[2] || parts[0]
      if (parts[1]) this._chainId = parts[1]
    }

    // Create StarknetWindowObject adapter
    this._wallet = createWCStarknetWindowObject({
      client: this._client,
      session: this._session,
      chainId: this._chainId,
      address: this._address!,
    })

    // Listen for networkChanged events to update chainId
    this._client.on('session_event', (event: { topic: string; params: { event: { name: string; data: unknown } } }) => {
      if (event.topic !== this._session?.topic) return
      const { name, data } = event.params.event
      if (name === 'networkChanged') {
        this._chainId = data as string
        this.emit('change', { chainId: BigInt(CHAIN_ID_MAP[this._chainId] || '0x0') })
      }
      if (name === 'accountsChanged' && Array.isArray(data) && data[0]) {
        this._address = data[0] as string
        this.emit('change', { account: this._address })
      }
    })

    this._client.on('session_delete', (event: { topic: string }) => {
      if (event.topic !== this._session?.topic) return
      this._session = null
      this._wallet = null
      this._address = null
      this.emit('disconnect')
    })

    const chainIdHex = CHAIN_ID_MAP[this._chainId] || '0x0'

    this.emit('connect', { account: this._address!, chainId: BigInt(chainIdHex) })
    this.emit('connectionStatus', 'success')

    return {
      account: this._address!,
      chainId: BigInt(chainIdHex),
    }
  }

  async disconnect(): Promise<void> {
    if (this._client && this._session) {
      try {
        await this._client.disconnect({
          topic: this._session.topic,
          reason: { code: 6000, message: 'User disconnected' },
        })
      } catch { /* session may already be deleted */ }
    }
    this._session = null
    this._wallet = null
    this._address = null
    this._client = null
    this.emit('disconnect')
  }

  async account(provider: ProviderOptions | ProviderInterface): Promise<AccountInterface> {
    if (!this._address || !this._wallet) throw new Error('Not connected')

    let rpcProvider: ProviderInterface
    if ('nodeUrl' in provider) {
      rpcProvider = new RpcProvider({ nodeUrl: (provider as ProviderOptions).nodeUrl })
    } else {
      rpcProvider = provider as ProviderInterface
    }

    return new WCProxyAccount(rpcProvider, this._address, this._wallet)
  }

  async chainId(): Promise<bigint> {
    const hex = CHAIN_ID_MAP[this._chainId] || '0x0'
    return BigInt(hex)
  }

  async request<T extends RpcMessage['type']>(
    call: RequestFnCall<T>
  ): Promise<RpcTypeToMessageMap[T]['result']> {
    if (!this._wallet) throw new Error('Not connected')
    return this._wallet.request(call)
  }

  /** Satisfy starknetkit's Connector interface */
  override eventNames(): (keyof ConnectorEvents)[] {
    return ['change', 'connect', 'disconnect']
  }
}

/**
 * Proxy Account that routes execute/signMessage through WalletConnect
 * while using a local RpcProvider for read operations.
 */
class WCProxyAccount extends Account {
  private _swo: StarknetWindowObject

  constructor(provider: ProviderInterface, address: string, swo: StarknetWindowObject) {
    super({ provider, address, signer: '0x0' })
    this._swo = swo
  }

  override async execute(calls: unknown) {
    const callsArray = Array.isArray(calls) ? calls : [calls]
    const result = await this._swo.request({
      type: 'wallet_addInvokeTransaction',
      params: { calls: callsArray },
    } as Parameters<StarknetWindowObject['request']>[0])
    return result as Awaited<ReturnType<Account['execute']>>
  }

  override async signMessage(typedData: unknown) {
    const result = await this._swo.request({
      type: 'wallet_signTypedData',
      params: typedData,
    } as Parameters<StarknetWindowObject['request']>[0])
    return result as string[]
  }

  /**
   * Compat shim: starknet.js v6+ renamed verifyMessage to verifyMessageInStarknet.
   * DApps targeting older versions call verifyMessage(), so we delegate here.
   */
  async verifyMessage(
    typedData: BigNumberish | TypedData,
    signature: Signature,
  ): Promise<boolean> {
    return this.verifyMessageInStarknet(typedData, signature, this.address)
  }

  /**
   * Route declare() through WalletConnect session.
   */
  override async declare(
    payload: DeclareContractPayload,
    _details?: UniversalDetails,
  ): Promise<DeclareContractResponse> {
    const result = await (this._swo.request as (call: { type: string; params: unknown }) => Promise<unknown>)({
      type: 'wallet_addDeclareTransaction',
      params: payload,
    })
    return result as DeclareContractResponse
  }

  /**
   * declareIfNot: check if already declared (read, local provider), then declare via WC if needed.
   */
  override async declareIfNot(
    payload: DeclareContractPayload,
    transactionsDetail?: UniversalDetails,
  ): Promise<DeclareContractResponse> {
    // Try to get the class — if it exists, it's already declared
    try {
      const classHash = typeof payload.contract === 'string'
        ? payload.contract
        : payload.classHash
      if (classHash) {
        await this.getClassByHash(classHash as string)
        return {
          transaction_hash: '',
          class_hash: classHash as string,
        } as DeclareContractResponse
      }
    } catch {
      // Class not found — proceed with declare
    }
    return this.declare(payload, transactionsDetail)
  }

  /**
   * Route deployAccount() through WalletConnect session.
   */
  override async deployAccount(
    payload: DeployAccountContractPayload,
    _details?: UniversalDetails,
  ): Promise<DeployContractResponse> {
    const result = await (this._swo.request as (call: { type: string; params: unknown }) => Promise<unknown>)({
      type: 'wallet_addDeployAccountTransaction',
      params: payload,
    })
    return result as DeployContractResponse
  }
}
