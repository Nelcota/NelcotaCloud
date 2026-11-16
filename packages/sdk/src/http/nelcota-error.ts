/** An error answered by the NelcotaCloud API. */
export class NelcotaError extends Error {
  /** HTTP status, e.g. 401. */
  readonly status: number
  /** Stable machine-readable code, e.g. `invalid_credentials`. */
  readonly code: string
  /** Id of the failed request, to quote when reporting a problem. */
  readonly requestId: string | null

  constructor(details: {
    status: number
    code: string
    message: string
    requestId: string | null
  }) {
    super(details.message)
    this.name = 'NelcotaError'
    this.status = details.status
    this.code = details.code
    this.requestId = details.requestId
  }
}
