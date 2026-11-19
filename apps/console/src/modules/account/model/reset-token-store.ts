import { tokenFromLocation } from '@/shared/routing/token-search'

const STORAGE_KEY = 'nelcota-reset-token'
/** Reset tokens are opaque and short; anything longer was not written by this page. */
const MAX_TOKEN_LENGTH = 512

/**
 * The reset link's token, kept for this tab only until the new password is saved. The page
 * wipes it from the address bar, so without this a reload would look like an expired link.
 */
export function resetTokenOnLoad(): string {
  const fromLink = tokenFromLocation()

  if (fromLink !== '') {
    writeToken(fromLink)
    return fromLink
  }

  return readToken()
}

export function forgetResetToken(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing was kept.
  }
}

function writeToken(token: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Storage unavailable: a reload will ask for a new link, as before.
  }
}

function readToken(): string {
  try {
    const stored = (window.sessionStorage.getItem(STORAGE_KEY) ?? '').trim()

    if (stored.length > MAX_TOKEN_LENGTH) {
      return ''
    }

    return stored
  } catch {
    return ''
  }
}
