import { NelcotaError } from '../../http/nelcota-error'

const CALLBACK_ERROR_STATUS = 400
const DEFAULT_MESSAGE = 'The OAuth login failed'

/** Messages for the `error` values the API puts in the redirect back to the app. */
const MESSAGES: ReadonlyMap<string, string> = new Map([
  ['access_denied', 'The login was cancelled at the provider'],
  ['email_not_verified', 'The provider account has no verified email'],
  [
    'email_confirmation_required',
    'The provider cannot confirm current ownership of this email. Sign in using an email-based method.',
  ],
  ['oauth_provider_changed', 'The OAuth provider settings changed. Start a new sign-in.'],
  [
    'temporarily_unavailable',
    'The OAuth provider is temporarily unavailable. Try signing in again.',
  ],
  ['server_error', 'The OAuth sign-in could not be completed. Try signing in again.'],
  ['account_conflict', 'This email is already linked to another account of this provider'],
  ['missing_oauth_code', 'The callback URL has neither a code nor an error'],
  ['missing_pkce_verifier', 'No OAuth login was started in this browser'],
])

/** An OAuth login that failed before any token could be requested. */
export function oauthCallbackError(code: string): NelcotaError {
  return new NelcotaError({
    status: CALLBACK_ERROR_STATUS,
    code,
    // A Map: `constructor` or `__proto__` in the URL never reach Object.prototype.
    message: MESSAGES.get(code) ?? DEFAULT_MESSAGE,
    requestId: null,
  })
}
