import { describe, expect, it } from 'vitest'

import { filterParam } from '../src/row-filters'

const BACKSLASH = String.fromCharCode(92)

describe('filterParam', () => {
  it('quotes plain values so commas and dots stay literal', () => {
    expect(filterParam({ column: 'city', operator: 'eq', value: 'Rio, RJ' })).toEqual([
      'city',
      'eq."Rio, RJ"',
    ])
  })

  it('escapes quotes and backslashes inside the value', () => {
    const value = `a"b${BACKSLASH}c`
    const expected = `like."a${BACKSLASH}"b${BACKSLASH}${BACKSLASH}c"`

    expect(filterParam({ column: 'note', operator: 'like', value })).toEqual(['note', expected])
  })

  it('passes keywords and lists as given', () => {
    expect(filterParam({ column: 'deleted_at', operator: 'is', value: 'null' })).toEqual([
      'deleted_at',
      'is.null',
    ])
    expect(filterParam({ column: 'id', operator: 'in', value: '1,2,3' })).toEqual([
      'id',
      'in.(1,2,3)',
    ])
  })
})
