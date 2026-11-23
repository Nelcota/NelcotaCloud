import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { CliError } from '../cli/cli-error'
import type { CommandContext } from '../cli/command-context'
import { displayPath } from '../cli/display-path'
import type { ParsedCommand } from '../cli/parse-command-line'
import { localPathsOf } from '../config/local-paths'
import { requireProjectRoot } from '../config/project-root'
import { readLocalMigrations } from '../migrations/local-migrations'
import { checkMigrationName, fileNameOf, versionOf } from '../migrations/migration-file-name'

/** Writes `nelcota/migrations/<YYYYMMDDHHMMSS>_<name>.sql` and prints its path. */
export async function runMigrationsNew(
  command: ParsedCommand,
  context: CommandContext,
): Promise<number> {
  const name = checkMigrationName(command.argument ?? '')
  const root = await requireProjectRoot(context.cwd)
  const folder = localPathsOf(root).migrations
  await mkdir(folder, { recursive: true })
  const version = versionOf(context.now())
  const existing = await readLocalMigrations(folder)

  if (existing.some((migration) => migration.version === version)) {
    throw new CliError(
      `Já existe uma migração com a versão ${version}. Tente de novo em um segundo.`,
    )
  }

  const path = join(folder, fileNameOf({ version, name }))
  // `wx` refuses to overwrite a file created in the meantime.
  await writeFile(path, `-- ${name}\n`, { flag: 'wx' })
  context.output.print(displayPath(context.cwd, path))

  return 0
}
