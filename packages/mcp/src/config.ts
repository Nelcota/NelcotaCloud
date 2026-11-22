/** Where the server runs and which project it acts on: one secret key, one project. */
export type McpConfig = { apiUrl: string; secretKey: string }

const SECRET_KEY_PREFIX = 'nc_sk_'
const DEFAULT_API_URL = 'http://localhost:8080'

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

/**
 * Reads `NELCOTA_SECRET_KEY` (required) and `NELCOTA_API_URL`. The key is the project's
 * secret API key: it never leaves this machine except toward the API.
 */
export function readConfig(environment: Record<string, string | undefined>): McpConfig {
  const secretKey = environment.NELCOTA_SECRET_KEY?.trim() ?? ''
  const apiUrl = (environment.NELCOTA_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, '')

  if (secretKey.startsWith(SECRET_KEY_PREFIX) === false) {
    throw new ConfigError(
      'Defina NELCOTA_SECRET_KEY com a chave secreta do projeto (começa com nc_sk_).',
    )
  }

  if (isWebAddress(apiUrl) === false) {
    throw new ConfigError(
      'NELCOTA_API_URL precisa ser um endereço http(s), como https://api.exemplo.com.',
    )
  }

  return { apiUrl, secretKey }
}

function isWebAddress(value: string): boolean {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
