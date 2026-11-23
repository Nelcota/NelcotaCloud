import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { CommandContext } from '../cli/command-context'
import { displayPath } from '../cli/display-path'
import { localPathsOf } from '../config/local-paths'
import { findProjectRoot } from '../config/project-root'
import { ensureLocalStateIgnored } from '../project/gitignore'
import type { IgnoreOutcome } from '../project/gitignore'

/** Creates `nelcota/migrations/` and ignores `.nelcota/`; running it again changes nothing. */
export async function runInit(context: CommandContext): Promise<number> {
  const { cwd, output } = context
  const root = (await findProjectRoot(cwd)) ?? cwd
  const { migrations } = localPathsOf(root)
  await mkdir(migrations, { recursive: true })
  // The append flag creates the file without truncating one that is already there.
  await writeFile(join(migrations, '.gitkeep'), '', { flag: 'a' })
  const ignore = await ensureLocalStateIgnored(root)

  output.print(`Migrações em ${displayPath(cwd, migrations)}`)
  output.print(ignoreMessage(cwd, ignore))

  return 0
}

function ignoreMessage(cwd: string, ignore: IgnoreOutcome): string {
  const path = displayPath(cwd, ignore.path)

  if (ignore.status === 'added') {
    return `.nelcota/ adicionado a ${path}`
  }

  return `.nelcota/ já estava em ${path}`
}
