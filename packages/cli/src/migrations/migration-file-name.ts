import { CliError } from '../cli/cli-error'

/** The server's rule for a migration name (`MigrationRequest.name`). */
const NAME_PATTERN = /^[a-z0-9_-]{1,100}$/
const FILE_NAME_PATTERN = /^(\d+)_([a-z0-9_-]{1,100})\.sql$/
const SQL_EXTENSION = '.sql'

export type MigrationFileName = { version: number; name: string }

export function checkMigrationName(name: string): string {
  if (NAME_PATTERN.test(name) === false) {
    throw new CliError(
      'Nome de migração inválido: use de 1 a 100 caracteres entre a-z, 0-9, _ e -.',
    )
  }

  return name
}

/** The UTC time as `YYYYMMDDHHMMSS`, read as an integer: newer files sort after older ones. */
export function versionOf(date: Date): number {
  const parts = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ]
  const [year = 0, ...rest] = parts
  const digits = `${String(year).padStart(4, '0')}${rest.map((part) => String(part).padStart(2, '0')).join('')}`

  return Number(digits)
}

export function fileNameOf(migration: MigrationFileName): string {
  return `${migration.version}_${migration.name}${SQL_EXTENSION}`
}

/**
 * Files other than `.sql` (`.gitkeep`, notes) are not migrations. A `.sql` file with another
 * name is refused rather than skipped: skipping it would leave the database behind silently.
 */
export function parseMigrationFileName(fileName: string): MigrationFileName | undefined {
  if (fileName.endsWith(SQL_EXTENSION) === false) {
    return undefined
  }

  const match = FILE_NAME_PATTERN.exec(fileName)
  const version = Number(match?.[1])
  const name = match?.[2]

  if (name === undefined || Number.isSafeInteger(version) === false || version < 1) {
    throw new CliError(
      `Arquivo de migração com nome inválido: ${fileName}. Use <versão>_<nome>.sql, com o nome entre a-z, 0-9, _ e -.`,
    )
  }

  return { version, name }
}
