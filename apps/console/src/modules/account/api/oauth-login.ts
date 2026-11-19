import type { OAuthProvider, SignInResult } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

export const OAUTH_CALLBACK_PATH = '/auth/callback'

/** Sends the browser to the provider; it comes back to the callback page. */
export async function startOAuthLogin(provider: OAuthProvider): Promise<void> {
  const redirectTo = new URL(OAUTH_CALLBACK_PATH, window.location.origin).toString()
  const authorizeUrl = await nelcota.auth.oauth.getAuthorizeUrl({ provider, redirectTo })
  window.location.assign(authorizeUrl)
}

/** Trades the one-time code in the callback URL for a session (or an MFA challenge). */
export function finishOAuthLogin(callbackUrl: string): Promise<SignInResult> {
  return nelcota.auth.oauth.exchangeCode(callbackUrl)
}
