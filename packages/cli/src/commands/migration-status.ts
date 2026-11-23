import { NelcotaApi } from '../api/api-client'
import type { CommandContext } from '../cli/command-context'
import type { ParsedCommand } from '../cli/parse-command-line'
import { localPathsOf } from '../config/local-paths'
import { requireProjectRoot } from '../config/project-root'
import { resolveApiTarget } from '../config/resolve-api-target'
import { readLocalMigrations } from '../migrations/local-migrations'
import { planMigrations } from '../migrations/migration-plan'
import type { MigrationPlan, PlanEntry } from '../migrations/migration-plan'
import { readRemoteMigrations } from '../migrations/remote-migrations'

export type MigrationStatus = { api: NelcotaApi; plan: MigrationPlan }

/** Local files against the server's history: what `list` shows and `push` acts on. */
export async function readMigrationStatus(
  command: ParsedCommand,
  context: CommandContext,
): Promise<MigrationStatus> {
  const root = await requireProjectRoot(context.cwd)
  const local = await readLocalMigrations(localPathsOf(root).migrations)
  const target = await resolveApiTarget(command.options, context)
  const api = new NelcotaApi(target, context.fetch)
  const remote = await readRemoteMigrations(api)

  return { api, plan: planMigrations(local, remote) }
}

const STATE_LABELS = {
  applied: 'aplicada',
  pending: 'pendente',
  remote_only: 'só no servidor',
  name_mismatch: 'versão com outro nome no servidor',
} as const

/** One line per version: `20260101120000_create_posts  aplicada`. */
export function describeEntries(entries: readonly PlanEntry[]): string[] {
  const labels = entries.map((entry) => `${entry.version}_${entry.name}`)
  const width = Math.max(0, ...labels.map((label) => label.length))

  return entries.map((entry, index) => {
    const label = (labels[index] ?? '').padEnd(width)

    return `${label}  ${describeState(entry)}`
  })
}

function describeState(entry: PlanEntry): string {
  if (entry.state === 'name_mismatch') {
    return `${STATE_LABELS.name_mismatch} (${entry.remoteName ?? ''})`
  }

  return STATE_LABELS[entry.state]
}
