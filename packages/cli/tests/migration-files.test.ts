import { describe, expect, it } from 'vitest'

import { CliError } from '../src/cli/cli-error'
import { localMigrationsOf } from '../src/migrations/local-migrations'
import {
  checkMigrationName,
  fileNameOf,
  parseMigrationFileName,
  versionOf,
} from '../src/migrations/migration-file-name'
import { checkSql } from '../src/migrations/pending-sql'

describe('migration file names', () => {
  it('builds the version from the UTC time', () => {
    expect(versionOf(new Date('2026-01-02T03:04:05Z'))).toBe(20260102030405)
    expect(versionOf(new Date('2026-12-31T23:59:59.999Z'))).toBe(20261231235959)
  })

  it('accepts the server rule for names', () => {
    expect(checkMigrationName('create_posts-2')).toBe('create_posts-2')
    expect(() => checkMigrationName('')).toThrow(CliError)
    expect(() => checkMigrationName('Create')).toThrow(CliError)
    expect(() => checkMigrationName('a b')).toThrow(CliError)
    expect(() => checkMigrationName('a'.repeat(101))).toThrow(CliError)
    expect(checkMigrationName('a'.repeat(100))).toHaveLength(100)
  })

  it('round-trips file names', () => {
    const fileName = fileNameOf({ version: 20260102030405, name: 'create_posts' })

    expect(fileName).toBe('20260102030405_create_posts.sql')
    expect(parseMigrationFileName(fileName)).toEqual({
      version: 20260102030405,
      name: 'create_posts',
    })
  })

  it('ignores files that are not SQL and refuses badly named SQL files', () => {
    expect(parseMigrationFileName('.gitkeep')).toBeUndefined()
    expect(() => parseMigrationFileName('create_posts.sql')).toThrow(CliError)
    expect(() => parseMigrationFileName('0_zero.sql')).toThrow(CliError)
    expect(() => parseMigrationFileName('99999999999999999_huge.sql')).toThrow(CliError)
  })
})

describe('localMigrationsOf', () => {
  it('sorts by version and keeps the file path', () => {
    const migrations = localMigrationsOf('/m', ['20_b.sql', '.gitkeep', '3_a.sql'])

    expect(migrations.map((migration) => migration.version)).toEqual([3, 20])
    expect(migrations[0]?.fileName).toBe('3_a.sql')
  })

  it('refuses two files with the same version', () => {
    expect(() => localMigrationsOf('/m', ['3_a.sql', '3_b.sql'])).toThrow('versão 3')
  })
})

describe('checkSql', () => {
  it('refuses empty and oversized files', () => {
    expect(() => checkSql('1_a.sql', ' \n')).toThrow(CliError)
    expect(() => checkSql('1_a.sql', 'x'.repeat(100_001))).toThrow(CliError)
    expect(() => checkSql('1_a.sql', 'select 1;')).not.toThrow()
  })
})
