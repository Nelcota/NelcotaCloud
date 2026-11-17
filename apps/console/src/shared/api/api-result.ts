import { ApiError } from '@/shared/api/api-error'

/** What every `apiClient` call returns: data on success, the error body otherwise. */
type ApiCallResult<T> = { data?: T; error?: unknown; response: Response }

/** The data of a successful call; an `ApiError` with the API's code and message otherwise. */
export function dataOf<T>(result: ApiCallResult<T>): T {
  if (result.response.ok === false || result.data === undefined) {
    throw toApiError(result)
  }

  return result.data
}

/** For calls answered with 204 No Content. */
export function ensureSuccess(result: ApiCallResult<unknown>): void {
  if (result.response.ok === false) {
    throw toApiError(result)
  }
}

function toApiError(result: ApiCallResult<unknown>): ApiError {
  const status = result.response.status
  const body = result.error

  if (isErrorBody(body)) {
    return new ApiError({ status, code: body.error, message: body.message })
  }

  return new ApiError({
    status,
    code: 'unknown_error',
    message: `A API não respondeu como esperado (erro ${status}). Tente de novo.`,
  })
}

function isErrorBody(body: unknown): body is { error: string; message: string } {
  if (typeof body !== 'object' || body === null) {
    return false
  }

  return (
    'error' in body &&
    typeof body.error === 'string' &&
    'message' in body &&
    typeof body.message === 'string'
  )
}
