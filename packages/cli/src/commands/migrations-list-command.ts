import type { CommandContext } from '../cli/command-context'
import type { ParsedCommand } from '../cli/parse-command-line'
import { describeEntries, readMigrationStatus } from './migration-status'

/** Every version, local or applied: `aplicada`, `pendente` or `só no servidor`. */
export async function runMigrationsList(
  command: ParsedCommand,
  context: CommandContext,
): Promise<number> {
  const { plan } = await readMigrationStatus(command, context)

  if (plan.entries.length === 0) {
    context.output.print('Nenhuma migração local ou aplicada.')

    return 0
  }

  for (const line of describeEntries(plan.entries)) {
    context.output.print(line)
  }

  return 0
}
