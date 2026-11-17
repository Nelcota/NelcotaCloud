/** Why a webhook request was refused; answer 400 and do not process it. */
export type WebhookVerificationCode =
  | 'missing_headers'
  | 'invalid_secret'
  | 'timestamp_out_of_range'
  | 'invalid_signature'
  | 'invalid_payload'

/** A webhook request that does not prove it came from NelcotaCloud. */
export class WebhookVerificationError extends Error {
  readonly code: WebhookVerificationCode

  constructor(code: WebhookVerificationCode, message: string) {
    super(message)
    this.name = 'WebhookVerificationError'
    this.code = code
  }
}
