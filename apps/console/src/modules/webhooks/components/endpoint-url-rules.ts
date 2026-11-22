import { isWebAddress, withHttps } from '@/shared/lib/web-address'

/** The API refuses longer receiver URLs. */
const MAX_URL_LENGTH = 2048
const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal']
const PRIVATE_PREFIXES = ['127.', '10.', '192.168.', '169.254.', '0.', '[::1]', '[fc', '[fd']
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[01])\./

/** What blocks saving the typed address, or `null` when it can be sent to the API. */
export function urlProblem(typed: string): string | null {
  const value = typed.trim()

  if (value === '') {
    return 'Digite o endereço do seu servidor'
  }

  const url = parsedUrl(value)

  if (url === null) {
    return 'Digite um endereço completo, como api.seuapp.com/webhooks'
  }

  if (url.username !== '' || url.password !== '') {
    return 'Tire o usuário e a senha do endereço'
  }

  if (withHttps(value).length > MAX_URL_LENGTH) {
    return 'O endereço passa de 2048 caracteres'
  }

  return null
}

/**
 * http and private hosts are refused in production and accepted only by servers started for
 * local development, so they warn instead of blocking.
 */
export function urlWarning(typed: string): string | null {
  const url = parsedUrl(typed.trim())

  if (url === null) {
    return null
  }

  if (url.protocol === 'http:' || isPrivateHost(url.hostname)) {
    return 'Endereços http:// e locais só funcionam em servidores de desenvolvimento.'
  }

  return null
}

function parsedUrl(value: string): URL | null {
  if (isWebAddress(value) === false) {
    return null
  }

  try {
    return new URL(withHttps(value))
  } catch {
    return null
  }
}

function isPrivateHost(host: string): boolean {
  const name = host.toLowerCase()

  if (name === 'localhost' || LOCAL_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
    return true
  }

  return PRIVATE_PREFIXES.some((prefix) => name.startsWith(prefix)) || PRIVATE_172.test(name)
}
