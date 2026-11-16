/** A response from the API with an error status. */
export class ApiError extends Error {
  readonly status: number
  /** The API's machine-readable code, e.g. `slug_taken`. */
  readonly code: string

  constructor(details: { status: number; code: string; message: string }) {
    super(details.message)
    this.name = 'ApiError'
    this.status = details.status
    this.code = details.code
  }
}
