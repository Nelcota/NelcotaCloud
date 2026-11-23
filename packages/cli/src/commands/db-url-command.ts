import { NelcotaApi } from '../api/api-client'
import type { CommandContext } from '../cli/command-context'
import type { ParsedCommand } from '../cli/parse-command-line'
import { resolveApiTarget } from '../config/resolve-api-target'
import {
  CONNECTION_PATH,
  maskedConnectionString,
  parseConnectionDetails,
  reachableConnectionOf,
} from '../db/connection-details'
import { DIRECT_CONNECTION_DISABLED_MESSAGE } from '../db/password-reset'

/** Prints the direct Postgres URL with `[SENHA]` where the password goes. */
export async function runDbUrl(command: ParsedCommand, context: CommandContext): Promise<number> {
  const { output } = context
  const target = await resolveApiTarget(command.options, context)
  const api = new NelcotaApi(target, context.fetch)
  const details = parseConnectionDetails(await api.get({ path: CONNECTION_PATH }))
  const connection = reachableConnectionOf(details)

  if (connection === undefined) {
    output.note(DIRECT_CONNECTION_DISABLED_MESSAGE)

    return 1
  }

  output.print(maskedConnectionString(connection))

  if (connection.hasPassword === false) {
    output.note('Ainda não há senha. Gere uma com nelcota db reset-password.')
  }

  return 0
}
