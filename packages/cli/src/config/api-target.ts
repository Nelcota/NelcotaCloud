import { CliError } from '../cli/cli-error'
import { isWebAddress, withoutTrailingSlash } from './web-address'

/** Which API to call and the project's secret key: one secret key, one project. */
export type ApiTarget = { apiUrl: string; secretKey: string }

export const SECRET_KEY_PREFIX = 'nc_sk_'
const DEFAULT_API_URL = 'http://localhost:8080'

/**
 * Reads `NELCOTA_SECRET_KEY` (required) and `NELCOTA_API_URL`; `--api-url` wins over the
 * variable. The key only ever travels to the API: it is never written to disk or printed.
 */
export function readRemoteTarget(
  environment: Record<string, string | undefined>,
  apiUrlOption: string | undefined,
): ApiTarget {
  const secretKey = environment.NELCOTA_SECRET_KEY?.trim() ?? ''
  const apiUrl = apiUrlOption?.trim() || environment.NELCOTA_API_URL?.trim() || DEFAULT_API_URL

  if (secretKey.startsWith(SECRET_KEY_PREFIX) === false) {
    throw new CliError(
      'Defina NELCOTA_SECRET_KEY com a chave secreta do projeto (começa com nc_sk_), ou use --local.',
    )
  }

  return { apiUrl: checkedApiUrl(apiUrl), secretKey }
}

/** Refuses anything but an http(s) address, so the key never goes to a file or another scheme. */
export function checkedApiUrl(value: string): string {
  const apiUrl = withoutTrailingSlash(value.trim())

  if (isWebAddress(apiUrl) === false) {
    throw new CliError('O endereço da API precisa ser http(s), como https://api.exemplo.com.')
  }

  return apiUrl
}
