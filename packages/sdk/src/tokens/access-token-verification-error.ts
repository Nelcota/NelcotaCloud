/** Why an access token was refused; answer 401 and do not trust the request. */
export type AccessTokenVerificationCode =
  | 'malformed'
  | 'unknown_key'
  | 'invalid_signature'
  | 'expired'
  | 'wrong_audience'
  | 'wrong_issuer'
  | 'jwks_unavailable'

/** An access token that does not prove it was issued by your project. */
export class AccessTokenVerificationError extends Error {
  readonly code: AccessTokenVerificationCode

  constructor(code: AccessTokenVerificationCode, message: string) {
    super(message)
    this.name = 'AccessTokenVerificationError'
    this.code = code
  }
}
