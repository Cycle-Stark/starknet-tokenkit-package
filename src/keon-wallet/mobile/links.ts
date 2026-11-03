/**
 * Links that open Keon from a dApp in the phone's browser (Keon #749,
 * starknet-wallet docs/security/deeplink-signing.md).
 *
 * - Pair links carry the WalletConnect pairing URI, which holds the pairing
 *   key, so they only go to Keon's verified App Link, or on Android Chrome to
 *   an intent addressed to Keon's package. Never the bare `keonwallet://`
 *   scheme: any app can register it.
 * - Wake links only carry the session topic (and the request id): they bring
 *   Keon forward so it picks up the request already sent over WalletConnect.
 *   Nothing secret. On Android Chrome the SDK follows one by itself when a
 *   request that needs approval is sent (openKeonOnRequest).
 *
 * Otherwise browsers only follow these from a user gesture: render a button.
 */

export const KEON_APP_LINK = 'https://keon.tokenkithq.io/wc'
export const KEON_ANDROID_PACKAGE = 'io.keon.wallet'
export const KEON_INSTALL_URL = 'https://keon.tokenkithq.io'

export type KeonPlatform = 'android_chrome' | 'mobile' | 'desktop'

/** Which kind of link this browser can follow. Pass a user agent to test. */
export function keonPlatform(userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): KeonPlatform {
  const ua = userAgent.toLowerCase()
  const android = ua.includes('android')
  // Chrome on Android, not the WebViews or Chromium forks that ignore intents.
  if (android && ua.includes('chrome/') && !ua.includes('; wv)') && !/samsungbrowser|opr\/|edga?\//.test(ua)) return 'android_chrome'
  if (android || /iphone|ipad|ipod/.test(ua)) return 'mobile'
  return 'desktop'
}

export interface KeonDeepLink {
  /** What to put in the button's href. On desktop, show a QR of `uri` instead. */
  href: string
  kind: 'intent' | 'app_link' | 'qr'
}

/** The link that pairs Keon with this dApp (connect). */
export function getDeepLink(uri: string, userAgent?: string): KeonDeepLink {
  const encoded = encodeURIComponent(uri)
  const platform = keonPlatform(userAgent)
  if (platform === 'android_chrome') {
    const fallback = encodeURIComponent(KEON_INSTALL_URL)
    return {
      kind: 'intent',
      href: `intent://keon.tokenkithq.io/wc?uri=${encoded}#Intent;scheme=https;package=${KEON_ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`,
    }
  }
  if (platform === 'mobile') return { kind: 'app_link', href: `${KEON_APP_LINK}?uri=${encoded}` }
  return { kind: 'qr', href: `${KEON_APP_LINK}?uri=${encoded}` }
}

/**
 * The link that brings Keon forward for a request already sent on this
 * session. `requestId` lets Keon open that request straight away. On Android
 * Chrome it is an intent addressed to Keon's package (the topic is not secret,
 * but the intent opens the app every time, where a plain link may load the
 * web page instead).
 */
export function getWakeLink(sessionTopic: string, opts: { requestId?: number | string; userAgent?: string } = {}): string {
  if (!/^[0-9a-f]{64}$/.test(sessionTopic)) throw new Error('getWakeLink: expected a 64-hex WalletConnect session topic')
  const requestId = opts.requestId !== undefined && /^\d{1,20}$/.test(String(opts.requestId)) ? `&requestId=${opts.requestId}` : ''
  const query = `topic=${sessionTopic}${requestId}`
  if (keonPlatform(opts.userAgent) === 'android_chrome') {
    const fallback = encodeURIComponent(KEON_INSTALL_URL)
    return `intent://keon.tokenkithq.io/wc?${query}#Intent;scheme=https;package=${KEON_ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`
  }
  return `${KEON_APP_LINK}?${query}`
}

/** WalletConnect methods that wait for the user in Keon (approve or reject). */
export const KEON_APPROVAL_METHODS: ReadonlySet<string> = new Set([
  'starknet_requestAddInvokeTransaction',
  'starknet_signTypedData',
  'starknet_requestAddDeclareTransaction',
  'starknet_requestAddDeployAccountTransaction',
  'starknet_deployContract',
  'starknet_declareIfNot',
])

/** Whether this browser can open Keon without a tap on the link itself. */
export function canAutoOpenKeon(userAgent?: string): boolean {
  // Android Chrome follows an intent to Keon's package from script while the
  // tap that started the request is still fresh, and the dApp page stays.
  // Elsewhere a scripted App Link can load Keon's web page in this tab
  // instead, losing the dApp: those keep the "Open Keon" button.
  return keonPlatform(userAgent) === 'android_chrome'
}

interface RequestSentSource {
  on(event: 'session_request_sent', listener: (e: { topic: string; id: number; request: { method: string } }) => void): unknown
  off(event: 'session_request_sent', listener: (e: { topic: string; id: number; request: { method: string } }) => void): unknown
}

/**
 * Opens Keon as soon as a request that needs the user is published on this
 * session, with its id, so the approval screen is waiting when Keon comes up.
 * Pass the WalletConnect SignClient. Does nothing where `canAutoOpenKeon` is
 * false. Returns a function that stops watching.
 */
export function openKeonOnRequest(
  client: RequestSentSource,
  sessionTopic: string,
  open: (link: string) => void = (link) => { window.location.href = link },
): () => void {
  if (typeof window === 'undefined' || !canAutoOpenKeon()) return () => {}
  const onSent = (e: { topic: string; id: number; request: { method: string } }) => {
    if (e.topic !== sessionTopic || !KEON_APPROVAL_METHODS.has(e.request.method)) return
    try { open(getWakeLink(sessionTopic, { requestId: e.id })) } catch { /* not a valid topic */ }
  }
  client.on('session_request_sent', onSent)
  return () => { client.off('session_request_sent', onSent) }
}
