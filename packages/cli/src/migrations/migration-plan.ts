import type { LocalMigration } from './local-migrations'
import type { RemoteMigration } from './remote-migrations'

export type MigrationState = 'applied' | 'pending' | 'remote_only' | 'name_mismatch'

export type PlanEntry = {
  version: number
  /** The local file's name, or the server's when only the server has the version. */
  name: string
  state: MigrationState
  remoteName: string | undefined
}

export type MigrationPlan = {
  /** Every version known here or on the server, oldest first. */
  entries: PlanEntry[]
  /** Local files the server has not applied, oldest first. */
  pending: LocalMigration[]
  /** Versions that make pushing unsafe: missing here, or the same version under another name. */
  conflicts: PlanEntry[]
}

/** Compares the local files with the server's history. */
export function planMigrations(
  local: readonly LocalMigration[],
  remote: readonly RemoteMigration[],
): MigrationPlan {
  const remoteByVersion = new Map(remote.map((migration) => [migration.version, migration]))
  const localVersions = new Set(local.map((migration) => migration.version))
  const localEntries = local.map((migration) =>
    entryOf(migration, remoteByVersion.get(migration.version)),
  )
  const remoteOnly = remote
    .filter((migration) => localVersions.has(migration.version) === false)
    .map((migration): PlanEntry => remoteOnlyEntryOf(migration))
  const entries = [...localEntries, ...remoteOnly].toSorted(byVersion)

  return {
    entries,
    pending: local
      .filter((migration) => remoteByVersion.has(migration.version) === false)
      .toSorted(byVersion),
    conflicts: entries.filter(
      (entry) => entry.state === 'remote_only' || entry.state === 'name_mismatch',
    ),
  }
}

function entryOf(migration: LocalMigration, applied: RemoteMigration | undefined): PlanEntry {
  const { version, name } = migration

  if (applied === undefined) {
    return { version, name, state: 'pending', remoteName: undefined }
  }

  if (applied.name !== name) {
    return { version, name, state: 'name_mismatch', remoteName: applied.name }
  }

  return { version, name, state: 'applied', remoteName: applied.name }
}

function remoteOnlyEntryOf(migration: RemoteMigration): PlanEntry {
  const { version, name } = migration

  return { version, name, state: 'remote_only', remoteName: name }
}

function byVersion(left: { version: number }, right: { version: number }): number {
  return left.version - right.version
}
