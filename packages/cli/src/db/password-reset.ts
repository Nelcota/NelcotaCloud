import type { NelcotaApi } from '../api/api-client'
import { ApiCallError } from '../api/http-json'
import { asRecord, stringField } from '../api/json-fields'
import { CliError } from '../cli/cli-error'

const PASSWORD_PATH = '/database/v1/connection/password'
const DIRECT_CONNECTION_DISABLED = 'direct_connection_disabled'

export const DIRECT_CONNECTION_DISABLED_MESSAGE =
  'As conexões diretas ao Postgres estão desativadas neste servidor.'

/** Asks the server for a new password; the old one stops working at once. */
export async function resetDatabasePassword(api: NelcotaApi): Promise<string> {
  const payload = await api.post({ path: PASSWORD_PATH }).catch((error: unknown) => {
    if (error instanceof ApiCallError && error.code === DIRECT_CONNECTION_DISABLED) {
      throw new CliError(DIRECT_CONNECTION_DISABLED_MESSAGE)
    }

    throw error
  })

  return stringField(asRecord(payload, 'password'), 'connection_string')
}
