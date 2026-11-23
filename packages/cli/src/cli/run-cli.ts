import { runDbResetPassword } from '../commands/db-reset-password-command'
import { runDbUrl } from '../commands/db-url-command'
import { runDevStart } from '../commands/dev-start-command'
import { runDevStatus } from '../commands/dev-status-command'
import { runDevStop } from '../commands/dev-stop-command'
import { runGenTypes } from '../commands/gen-types-command'
import { runInit } from '../commands/init-command'
import { runMigrationsList } from '../commands/migrations-list-command'
import { runMigrationsNew } from '../commands/migrations-new-command'
import { runMigrationsPush } from '../commands/migrations-push-command'
import type { CommandName } from './command-catalog'
import type { CommandContext } from './command-context'
import { CLI_VERSION, HELP_TEXT } from './help-text'
import { parseCommandLine } from './parse-command-line'
import type { ParsedCommand } from './parse-command-line'

type CommandHandler = (command: ParsedCommand, context: CommandContext) => Promise<number>

const HANDLERS: Record<CommandName, CommandHandler> = {
  help: async (_command, context) => {
    context.output.print(HELP_TEXT.trimEnd())

    return 0
  },
  version: async (_command, context) => {
    context.output.print(CLI_VERSION)

    return 0
  },
  init: (_command, context) => runInit(context),
  'migrations new': runMigrationsNew,
  'migrations list': runMigrationsList,
  'migrations push': runMigrationsPush,
  'gen types': runGenTypes,
  'db url': runDbUrl,
  'db reset-password': runDbResetPassword,
  'dev start': runDevStart,
  'dev stop': runDevStop,
  'dev status': (_command, context) => runDevStatus(context),
}

/** Runs one command line and resolves with the process exit code. */
export function runCli(argv: readonly string[], context: CommandContext): Promise<number> {
  const command = parseCommandLine(argv)

  return HANDLERS[command.name](command, context)
}
