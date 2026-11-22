import { describe, expect, it } from 'vitest'

import { canEditRows, ensureOneRow, keySelect, rowKey } from '@/modules/database/components/row-key'
import { ApiError } from '@/shared/api/api-error'
import type { components } from '@/shared/api/api-schema'

type Table = components['schemas']['TableOverview']
type Column = components['schemas']['ColumnOverview']

function column(name: string, isKey: boolean): Column {
  return {
    name,
    type: 'text',
    nullable: false,
    default: null,
    is_identity: false,
    is_primary_key: isKey,
    is_unique: false,
  }
}

function table(kind: string, columns: Column[]): Table {
  return {
    name: 't',
    kind,
    rls_enabled: true,
    size_bytes: 0,
    columns,
    foreign_keys: [],
    indexes: [],
    policies: [],
  }
}

const composite = table('table', [column('a', true), column('b', true), column('c', false)])

describe('rows can be changed', () => {
  it('only on tables with a primary key', () => {
    expect(canEditRows(composite)).toBe(true)
    expect(canEditRows(table('table', [column('a', false)]))).toBe(false)
    expect(canEditRows(table('view', [column('a', true)]))).toBe(false)
  })
})

describe('rowKey', () => {
  it('names a row by every key column', () => {
    expect(rowKey(composite, { a: 1, b: 'x', c: 'ignored' })).toEqual([
      { column: 'a', operator: 'eq', value: '1' },
      { column: 'b', operator: 'eq', value: 'x' },
    ])
  })

  it('refuses rows whose key is missing or not a plain value', () => {
    expect(rowKey(composite, { a: 1, b: null })).toBeNull()
    expect(rowKey(composite, { a: { nested: true }, b: 'x' })).toBeNull()
  })

  it('asks only for the key back', () => {
    expect(keySelect([{ column: 'a', operator: 'eq', value: '1' }])).toBe('a')
  })
})

describe('ensureOneRow', () => {
  it('fails when the row is gone', () => {
    expect(() => ensureOneRow([])).toThrow(ApiError)
    expect(() => ensureOneRow([{ a: 1 }])).not.toThrow()
  })
})
