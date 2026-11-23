import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { CliError } from '../cli/cli-error'
import { parseMigrationFileName } from './migration-file-name'
import type { MigrationFileName } from './migration-file-name'

export type LocalMigration = MigrationFileName & { fileName: string; path: string }

/** The migration files of `nelcota/migrations/`, oldest version first. */
export async function readLocalMigrations(folder: string): Promise<LocalMigration[]> {
  const fileNames = await readdir(folder).catch(() => {
    throw new CliError('Pasta nelcota/migrations/ não encontrada. Rode nelcota init.')
  })

  return localMigrationsOf(folder, fileNames)
}

export function localMigrationsOf(folder: string, fileNames: readonly string[]): LocalMigration[] {
  const migrations = fileNames.flatMap((fileName) => {
    const parsed = parseMigrationFileName(fileName)

    if (parsed === undefined) {
      return []
    }

    return [{ ...parsed, fileName, path: join(folder, fileName) }]
  })
  const sorted = migrations.toSorted((left, right) => left.version - right.version)
  checkUniqueVersions(sorted)

  return sorted
}

function checkUniqueVersions(sorted: readonly LocalMigration[]): void {
  const repeated = sorted.find(
    (migration, index) => sorted[index + 1]?.version === migration.version,
  )

  if (repeated === undefined) {
    return
  }

  throw new CliError(`Duas migrações locais usam a versão ${repeated.version}. Renomeie uma delas.`)
}
