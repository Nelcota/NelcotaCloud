import { describe, expect, it } from 'vitest'

import { describeEntries } from '../src/commands/migration-status'
import type { LocalMigration } from '../src/migrations/local-migrations'
import { planMigrations } from '../src/migrations/migration-plan'
import type { RemoteMigration } from '../src/migrations/remote-migrations'

function local(version: number, name: string): LocalMigration {
  return { version, name, fileName: `${version}_${name}.sql`, path: `/m/${version}_${name}.sql` }
}

function remote(version: number, name: string): RemoteMigration {
  return { version, name, appliedAt: '2026-01-01T00:00:00Z' }
}

describe('planMigrations', () => {
  it('marks applied and pending versions, oldest pending first', () => {
    const plan = planMigrations([local(3, 'c'), local(1, 'a'), local(2, 'b')], [remote(1, 'a')])

    expect(plan.entries.map((entry) => entry.state)).toEqual(['applied', 'pending', 'pending'])
    expect(plan.pending.map((migration) => migration.version)).toEqual([2, 3])
    expect(plan.conflicts).toEqual([])
  })

  it('reports versions only on the server and names that differ', () => {
    const plan = planMigrations([local(2, 'b'), local(3, 'c')], [remote(1, 'a'), remote(2, 'x')])

    expect(plan.entries.map((entry) => entry.state)).toEqual([
      'remote_only',
      'name_mismatch',
      'pending',
    ])
    expect(plan.conflicts.map((entry) => entry.version)).toEqual([1, 2])
  })

  it('has nothing to do when both sides are empty', () => {
    expect(planMigrations([], [])).toEqual({ entries: [], pending: [], conflicts: [] })
  })
})

describe('describeEntries', () => {
  it('aligns one line per version in Portuguese', () => {
    const plan = planMigrations([local(10, 'b'), local(2, 'x')], [remote(1, 'a'), remote(2, 'y')])

    expect(describeEntries(plan.entries)).toEqual([
      '1_a   só no servidor',
      '2_x   versão com outro nome no servidor (y)',
      '10_b  pendente',
    ])
  })
})
