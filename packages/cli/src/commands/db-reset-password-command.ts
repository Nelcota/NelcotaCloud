import { NelcotaApi } from '../api/api-client'
import { CliError } from '../cli/cli-error'
import type { CommandContext } from '../cli/command-context'
import type { ParsedCommand } from '../cli/parse-command-line'
import { resolveApiTarget } from '../config/resolve-api-target'
import { resetDatabasePassword } from '../db/password-reset'

const QUESTION = 'Gerar uma nova senha do Postgres? A senha atual deixa de funcionar. (s/N) '

/** Replaces the direct-connection password and prints the new connection string once. */
export async function runDbResetPassword(
  command: ParsedCommand,
  context: CommandContext,
): Promise<number> {
  const { output } = context
  const target = await resolveApiTarget(command.options, context)

  if ((await isConfirmed(command, context)) === false) {
    output.note('Nada foi alterado.')

    return 1
  }

  const connectionString = await resetDatabasePassword(new NelcotaApi(target, context.fetch))
  output.print(connectionString)
  output.note('A senha anterior parou de funcionar. Guarde a nova agora: ela não aparece de novo.')

  return 0
}

/** `--yes` answers for scripts; without it a person must answer at a terminal. */
async function isConfirmed(command: ParsedCommand, context: CommandContext): Promise<boolean> {
  if (command.options.yes) {
    return true
  }

  if (context.isInteractive() === false) {
    throw new CliError('Sem terminal para confirmar: use --yes para trocar a senha.')
  }

  return context.confirm(QUESTION)
}
