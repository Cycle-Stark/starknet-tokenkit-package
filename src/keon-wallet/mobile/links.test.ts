import { afterEach, describe, expect, it, vi } from 'vitest'

import { getDeepLink, getWakeLink, keonPlatform, openKeonOnRequest } from './links'

const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36'
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const URI = `wc:${'a'.repeat(64)}@2?relay-protocol=irn&symKey=${'b'.repeat(64)}&expiryTimestamp=1800000300`

describe('keonPlatform', () => {
  it('only treats real Android Chrome as intent-capable', () => {
    expect(keonPlatform(ANDROID_CHROME)).toBe('android_chrome')
    expect(keonPlatform(ANDROID_WEBVIEW)).toBe('mobile')
    expect(keonPlatform(SAMSUNG)).toBe('mobile')
    expect(keonPlatform(IPHONE)).toBe('mobile')
    expect(keonPlatform(DESKTOP)).toBe('desktop')
  })
})

describe('getDeepLink', () => {
  it('Android Chrome: an intent addressed to Keon\'s package, with the App Link URL inside', () => {
    const { kind, href } = getDeepLink(URI, ANDROID_CHROME)
    expect(kind).toBe('intent')
    expect(href.startsWith('intent://keon.tokenkithq.io/wc?uri=')).toBe(true)
    expect(href).toContain(';scheme=https;package=io.keon.wallet;')
    expect(href).toContain('S.browser_fallback_url=https%3A%2F%2Fkeon.tokenkithq.io;end')
    expect(decodeURIComponent(href.split('uri=')[1].split('#')[0])).toBe(URI)
  })

  it('other phones: the verified App Link; never the bare keonwallet:// scheme', () => {
    expect(getDeepLink(URI, IPHONE)).toEqual({ kind: 'app_link', href: `https://keon.tokenkithq.io/wc?uri=${encodeURIComponent(URI)}` })
    for (const ua of [ANDROID_CHROME, ANDROID_WEBVIEW, IPHONE, DESKTOP]) expect(getDeepLink(URI, ua).href).not.toContain('keonwallet://')
  })

  it('desktop: show a QR', () => {
    expect(getDeepLink(URI, DESKTOP).kind).toBe('qr')
  })
})

describe('getWakeLink', () => {
  it('carries only the session topic', () => {
    expect(getWakeLink('c'.repeat(64))).toBe(`https://keon.tokenkithq.io/wc?topic=${'c'.repeat(64)}`)
    expect(() => getWakeLink('not-a-topic')).toThrow()
  })

  it('adds the request id, and only a numeric one', () => {
    expect(getWakeLink(TOPIC, { requestId: 1730000000123456, userAgent: IPHONE })).toBe(`https://keon.tokenkithq.io/wc?topic=${TOPIC}&requestId=1730000000123456`)
    expect(getWakeLink(TOPIC, { requestId: '1&uri=x', userAgent: IPHONE })).toBe(`https://keon.tokenkithq.io/wc?topic=${TOPIC}`)
  })

  it('Android Chrome: an intent addressed to Keon\'s package', () => {
    expect(getWakeLink(TOPIC, { requestId: 7, userAgent: ANDROID_CHROME })).toBe(
      `intent://keon.tokenkithq.io/wc?topic=${TOPIC}&requestId=7#Intent;scheme=https;package=io.keon.wallet;S.browser_fallback_url=https%3A%2F%2Fkeon.tokenkithq.io;end`,
    )
  })
})

const TOPIC = 'c'.repeat(64)

type Sent = { topic: string; id: number; request: { method: string } }
function fakeClient() {
  const fns = new Set<(e: Sent) => void>()
  return {
    on: (_: 'session_request_sent', fn: (e: Sent) => void) => fns.add(fn),
    off: (_: 'session_request_sent', fn: (e: Sent) => void) => fns.delete(fn),
    emit: (e: Sent) => fns.forEach((fn) => fn(e)),
    size: () => fns.size,
  }
}

describe('openKeonOnRequest', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Android Chrome: opens Keon with the request id when an approval request is sent on this session', () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { userAgent: ANDROID_CHROME })
    const client = fakeClient()
    const open = vi.fn()
    const stop = openKeonOnRequest(client, TOPIC, open)

    client.emit({ topic: TOPIC, id: 42, request: { method: 'starknet_call' } })
    client.emit({ topic: 'd'.repeat(64), id: 43, request: { method: 'starknet_requestAddInvokeTransaction' } })
    expect(open).not.toHaveBeenCalled()

    client.emit({ topic: TOPIC, id: 44, request: { method: 'starknet_requestAddInvokeTransaction' } })
    expect(open).toHaveBeenCalledOnce()
    expect(open.mock.calls[0][0]).toContain(`wc?topic=${TOPIC}&requestId=44#Intent;`)

    stop()
    expect(client.size()).toBe(0)
  })

  it('iPhone and desktop: never opens by itself (the button stays)', () => {
    for (const ua of [IPHONE, DESKTOP, ANDROID_WEBVIEW]) {
      vi.stubGlobal('window', {})
      vi.stubGlobal('navigator', { userAgent: ua })
      const client = fakeClient()
      openKeonOnRequest(client, TOPIC, vi.fn())
      expect(client.size()).toBe(0)
    }
  })
})
