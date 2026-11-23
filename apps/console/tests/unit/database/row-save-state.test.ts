import { describe, expect, it } from 'vitest'

import type { RowTarget } from '@/modules/database/components/row-editor-sheet'
import { rowSaveMissing } from '@/modules/database/components/row-save-state'

const NEW_ROW: RowTarget = { kind: 'new', draft: {} }
const EXISTING_ROW: RowTarget = { kind: 'existing', number: 1, key: [], draft: {}, json: '{}' }

describe('rowSaveMissing', () => {
  it('says an existing row has nothing to save before any change', () => {
    expect(rowSaveMissing(EXISTING_ROW, { changeCount: 0, hasFieldErrors: false })).toBe(
      'Nenhuma alteração para salvar',
    )
  })

  it('asks to fix the marked fields while one has an error', () => {
    expect(rowSaveMissing(NEW_ROW, { changeCount: 0, hasFieldErrors: true })).toBe(
      'Corrija os campos marcados',
    )
    expect(rowSaveMissing(EXISTING_ROW, { changeCount: 2, hasFieldErrors: true })).toBe(
      'Corrija os campos marcados',
    )
  })

  it('lets a new row or a changed one be saved', () => {
    expect(rowSaveMissing(NEW_ROW, { changeCount: 0, hasFieldErrors: false })).toBeNull()
    expect(rowSaveMissing(EXISTING_ROW, { changeCount: 1, hasFieldErrors: false })).toBeNull()
  })
})
