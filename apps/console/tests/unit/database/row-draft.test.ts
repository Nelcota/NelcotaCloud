import { describe, expect, it } from 'vitest'

import {
  blankDraft,
  canUseDefault,
  changedValues,
  draftFromRow,
  fieldError,
  hasErrors,
  insertValues,
  isJsonColumn,
} from '@/modules/database/components/row-draft'
import type { components } from '@/shared/api/api-schema'

type Column = components['schemas']['ColumnOverview']

function column(overrides: Partial<Column> & { name: string }): Column {
  return {
    type: 'text',
    nullable: false,
    default: null,
    is_identity: false,
    is_primary_key: false,
    is_unique: false,
    ...overrides,
  }
}

const id = column({ name: 'id', type: 'bigint', is_identity: true, is_primary_key: true })
const name = column({ name: 'nome' })
const city = column({ name: 'cidade', nullable: true })
const active = column({ name: 'ativo', type: 'boolean', default: 'true' })
const tags = column({ name: 'tags', type: 'jsonb', nullable: true })
const columns = [id, name, city, active, tags]

describe('a new row', () => {
  it('leaves generated and defaulted columns to Postgres and starts nullable ones as NULL', () => {
    expect(blankDraft(columns)).toEqual({
      id: { text: '', mode: 'default' },
      nome: { text: '', mode: 'value' },
      cidade: { text: '', mode: 'null' },
      ativo: { text: '', mode: 'default' },
      tags: { text: '', mode: 'null' },
    })
  })

  it('sends only what the user set, JSON parsed for JSON columns', () => {
    const draft = {
      ...blankDraft(columns),
      nome: { text: 'Ana', mode: 'value' as const },
      tags: { text: '{"vip": true}', mode: 'value' as const },
    }

    expect(insertValues(columns, draft)).toEqual({ nome: 'Ana', cidade: null, tags: { vip: true } })
  })

  it('knows which columns may be left out', () => {
    expect(canUseDefault(id)).toBe(true)
    expect(canUseDefault(active)).toBe(true)
    expect(canUseDefault(city)).toBe(false)
    expect(isJsonColumn(column({ name: 'n', type: 'integer[]' }))).toBe(true)
  })
})

describe('an existing row', () => {
  const row = { id: 7, nome: 'Bia', cidade: null, ativo: true, tags: { vip: false } }

  it('reads each value as text, NULL as its own mode', () => {
    const draft = draftFromRow(columns, row)

    expect(draft.id).toEqual({ text: '7', mode: 'value' })
    expect(draft.cidade).toEqual({ text: '', mode: 'null' })
    expect(draft.tags?.text).toBe('{\n  "vip": false\n}')
  })

  it('sends only the columns that changed', () => {
    const original = draftFromRow(columns, row)
    const edited = {
      ...original,
      nome: { text: 'Beatriz', mode: 'value' as const },
      cidade: { text: 'Recife', mode: 'value' as const },
    }

    expect(changedValues(columns, { original, edited })).toEqual({
      nome: 'Beatriz',
      cidade: 'Recife',
    })
    expect(changedValues(columns, { original, edited: original })).toEqual({})
  })
})

describe('validation', () => {
  it('flags JSON that does not parse, and only on JSON columns', () => {
    expect(fieldError(tags, { text: '{oops', mode: 'value' })).toBe('JSON inválido.')
    expect(fieldError(tags, { text: '{oops', mode: 'null' })).toBeNull()
    expect(fieldError(name, { text: '{oops', mode: 'value' })).toBeNull()
    expect(hasErrors(columns, { tags: { text: '[1,', mode: 'value' } })).toBe(true)
  })
})
