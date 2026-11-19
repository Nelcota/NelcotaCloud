import { describeError } from '@/shared/api/describe-error'

/**
 * The errors the provider's redirect brings back. `email_not_verified` here is about the
 * Google or GitHub account, not the console's own confirmation email, so it gets its own text.
 */
const MESSAGES_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['access_denied', 'O login foi cancelado antes de terminar. Tente de novo.'],
  [
    'email_not_verified',
    'Essa conta do Google ou do GitHub não tem um email confirmado. Confirme lá e tente de novo.',
  ],
  ['account_conflict', 'Esse email já está ligado a outra conta desse provedor.'],
  ['missing_oauth_code', 'O retorno do login veio incompleto. Tente de novo.'],
  [
    'missing_pkce_verifier',
    'Esse login começou em outro navegador ou aba anônima. Comece de novo por aqui.',
  ],
])

/** Why the Google or GitHub login failed, in words a non-technical person can act on. */
export function oauthFailureMessage(error: Error): string {
  const message = MESSAGES_BY_CODE.get(errorCode(error))

  if (message === undefined) {
    return describeError(error)
  }

  return message
}

function errorCode(error: Error): string {
  if ('code' in error && typeof error.code === 'string') {
    return error.code
  }

  return ''
}
