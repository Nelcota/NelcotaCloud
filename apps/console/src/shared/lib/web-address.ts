const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const HTTPS_PREFIX = 'https://'
const WEB_PROTOCOLS = ['https:', 'http:']
// Local development sites (`http://localhost:5173`) have no dot in their host.
const LOCAL_HOST = 'localhost'

/** Whether the typed address already names its scheme (`http://localhost:5173`). */
export function hasScheme(typed: string): boolean {
  return SCHEME.test(typed.trim())
}

/**
 * The address to send: what was typed, trimmed, with `https://` in front when no scheme was
 * typed, so people never have to write it. An explicit `http://` (local development) is kept.
 */
export function withHttps(typed: string): string {
  const value = typed.trim()

  if (value === '' || hasScheme(value)) {
    return value
  }

  return `${HTTPS_PREFIX}${value}`
}

/** What the field shows for a saved address: without `https://`, which the field already shows. */
export function withoutHttps(address: string): string {
  if (address.toLowerCase().startsWith(HTTPS_PREFIX)) {
    return address.slice(HTTPS_PREFIX.length)
  }

  return address
}

/** Whether what was typed (with `https://` added when missing) is a web address with a host. */
export function isWebAddress(typed: string): boolean {
  try {
    const url = new URL(withHttps(typed))
    const host = url.hostname

    return WEB_PROTOCOLS.includes(url.protocol) && (host.includes('.') || host === LOCAL_HOST)
  } catch {
    return false
  }
}
