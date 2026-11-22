import { NelcotaError } from './nelcota-error'

const REQUEST_ID_HEADER = 'x-request-id'
const UNKNOWN_ERROR_CODE = 'unknown_error'

export async function toNelcotaError(response: Response): Promise<NelcotaError> {
  const requestId = response.headers.get(REQUEST_ID_HEADER)
  const payload: unknown = await response.json().catch(() => null)
  const fallback = {
    status: response.status,
    code: UNKNOWN_ERROR_CODE,
    message: response.statusText,
    requestId,
    retryAfterSeconds: retryAfterSeconds(response.headers.get('retry-after')),
  }

  if (isErrorPayload(payload) === false) {
    return new NelcotaError(fallback)
  }

  return new NelcotaError({ ...fallback, code: payload.error, message: payload.message })
}

function retryAfterSeconds(raw: string | null): number | null {
  if (raw === null || /^[0-9]+$/.test(raw) === false) {
    return null
  }

  const seconds = Number(raw)

  return Number.isSafeInteger(seconds) ? seconds : null
}

function isErrorPayload(payload: unknown): payload is { error: string; message: string } {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }

  return (
    'error' in payload &&
    typeof payload.error === 'string' &&
    'message' in payload &&
    typeof payload.message === 'string'
  )
}
