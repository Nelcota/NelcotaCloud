import type { NelcotaApi } from '../api/api-client'
import {
  arrayField,
  asRecord,
  integerField,
  nullableIntegerField,
  stringField,
} from '../api/json-fields'
import { CliError } from '../cli/cli-error'

export const MIGRATIONS_PATH = '/database/v1/migrations'

export type RemoteMigration = { version: number; name: string; appliedAt: string }

export type MigrationPage = { migrations: RemoteMigration[]; nextBefore: number | null }

/** Every migration the server applied, following `next_before` until the oldest page. */
export function readRemoteMigrations(api: NelcotaApi): Promise<RemoteMigration[]> {
  return readFrom(api, undefined, [])
}

async function readFrom(
  api: NelcotaApi,
  before: number | undefined,
  collected: readonly RemoteMigration[],
): Promise<RemoteMigration[]> {
  const payload = await api.get({ path: MIGRATIONS_PATH, query: queryOf(before) })
  const page = parseMigrationPage(payload)
  const migrations = [...collected, ...page.migrations]

  if (page.nextBefore === null) {
    return migrations
  }

  if (before !== undefined && page.nextBefore >= before) {
    throw new CliError('A API repetiu uma página do histórico de migrações.')
  }

  return readFrom(api, page.nextBefore, migrations)
}

function queryOf(before: number | undefined): Record<string, string> {
  if (before === undefined) {
    return {}
  }

  return { before: String(before) }
}

export function parseMigrationPage(payload: unknown): MigrationPage {
  const record = asRecord(payload, 'migrations')
  const migrations = arrayField(record, 'migrations').map((entry) => {
    const migration = asRecord(entry, 'migrations[]')

    return {
      version: integerField(migration, 'version'),
      name: stringField(migration, 'name'),
      appliedAt: stringField(migration, 'applied_at'),
    }
  })

  return { migrations, nextBefore: nullableIntegerField(record, 'next_before') }
}
