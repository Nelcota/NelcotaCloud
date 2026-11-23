import { readFile } from 'node:fs/promises'

import { CliError } from '../cli/cli-error'
import type { LocalMigration } from './local-migrations'

/** The server's limit on one migration (`MigrationRequest.sql`), in characters. */
const MAX_SQL_LENGTH = 100_000

export type PendingMigration = LocalMigration & { sql: string }

/**
 * Reads every pending file before anything is sent, so an empty or oversized file stops the
 * push before the first migration runs. Contents go as they are: the server's checksum
 * includes whitespace and line endings.
 */
export async function readPendingSql(
  pending: readonly LocalMigration[],
): Promise<PendingMigration[]> {
  const contents = await Promise.all(pending.map((migration) => readFile(migration.path, 'utf8')))

  return pending.map((migration, index) => {
    const sql = contents[index] ?? ''
    checkSql(migration.fileName, sql)

    return { ...migration, sql }
  })
}

export function checkSql(fileName: string, sql: string): void {
  if (sql.trim() === '') {
    throw new CliError(`${fileName} está vazio. Escreva o SQL ou apague o arquivo.`)
  }

  if (Array.from(sql).length > MAX_SQL_LENGTH) {
    throw new CliError(
      `${fileName} passa de ${MAX_SQL_LENGTH} caracteres. Divida-o em mais migrações.`,
    )
  }
}
