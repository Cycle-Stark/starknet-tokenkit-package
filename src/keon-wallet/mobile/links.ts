/**
 * Links that open Keon from a dApp in the phone's browser (Keon #749,
 * starknet-wallet docs/security/deeplink-signing.md).
 *
 * - Pair links carry the WalletConnect pairing URI, which holds the pairing
 *   key, so they only go to Keon's verified App Link, or on Android Chrome to
 *   an intent addressed to Keon's package. Never the bare `keonwallet://`
 *   scheme: any app can register it.
 * - Wake links only carry the session topic: they bring Keon forward so it
 *   picks up the request already sent over WalletConnect. Nothing secret.
 *
 * Browsers only follow these from a user gesture: render them as a button.
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

/** The link that brings Keon forward for a request already sent on this session. */
export function getWakeLink(sessionTopic: string): string {
  if (!/^[0-9a-f]{64}$/.test(sessionTopic)) throw new Error('getWakeLink: expected a 64-hex WalletConnect session topic')
  return `${KEON_APP_LINK}?topic=${sessionTopic}`
}
