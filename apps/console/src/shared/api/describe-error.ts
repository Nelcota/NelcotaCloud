import {
  FALLBACK_BY_CODE,
  MESSAGES_BY_CODE,
  MESSAGES_BY_TEXT,
} from '@/shared/api/api-error-messages'

const FALLBACK_MESSAGE = 'Algo deu errado. Tente de novo.'
const OFFLINE_MESSAGE = 'Não foi possível falar com a API. Confira sua conexão e tente de novo.'
const SMTP_PORT_PREFIX = 'SMTP port '
const SMTP_PORT_MESSAGE = 'Essa porta SMTP não é permitida. Use 25, 465, 587 ou 2525.'

/** `toApiError` builds these itself, already in Portuguese, when the body is not the API's. */
const UNKNOWN_CODE = 'unknown_error'

type CodedError = { code: string; message: string }

/**
 * The sentence people read for an API, SDK or network failure: Portuguese for every refusal the
 * API documents, never its English text or a bare status code.
 */
export function describeError(error: unknown): string {
  if (isCodedError(error)) {
    return describeCoded(error)
  }

  if (error instanceof TypeError) {
    return OFFLINE_MESSAGE
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return FALLBACK_MESSAGE
}

function describeCoded(error: CodedError): string {
  if (error.code === UNKNOWN_CODE) {
    return error.message
  }

  const byCode = MESSAGES_BY_CODE[error.code]

  if (byCode !== undefined) {
    return byCode
  }

  const byText = MESSAGES_BY_TEXT[error.message]

  if (byText !== undefined) {
    return byText
  }

  if (error.message.startsWith(SMTP_PORT_PREFIX)) {
    return SMTP_PORT_MESSAGE
  }

  return FALLBACK_BY_CODE[error.code] ?? FALLBACK_MESSAGE
}

function isCodedError(error: unknown): error is CodedError {
  if (error instanceof Error === false) {
    return false
  }

  return 'code' in error && typeof error.code === 'string'
}
