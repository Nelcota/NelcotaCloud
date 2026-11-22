import { describe, expect, it } from 'vitest'

import {
  filterParam,
  filtersKey,
  isRowFilterOperator,
  needsValue,
  operatorInfo,
  restQueryString,
} from '@/modules/database/components/row-filter'

const BACKSLASH = String.fromCharCode(92)

describe('filterParam', () => {
  it('quotes every value, so commas and dots stay literal', () => {
    expect(filterParam({ column: 'cidade', operator: 'eq', value: 'Rio, RJ' })).toEqual([
      'cidade',
      'eq."Rio, RJ"',
    ])
    expect(filterParam({ column: 'preco', operator: 'gte', value: '10.5' })).toEqual([
      'preco',
      'gte."10.5"',
    ])
  })

  it('escapes quotes and backslashes inside the value', () => {
    const value = `a"b${BACKSLASH}c`

    expect(filterParam({ column: 'nota', operator: 'neq', value })[1]).toBe(
      `neq."a${BACKSLASH}"b${BACKSLASH}${BACKSLASH}c"`,
    )
  })

  it('turns "contains" into a case-insensitive like with wildcards', () => {
    expect(filterParam({ column: 'nome', operator: 'ilike', value: 'rio' })).toEqual([
      'nome',
      'ilike."*rio*"',
    ])
  })

  it('writes the null checks without a value', () => {
    expect(filterParam({ column: 'x', operator: 'is-null', value: 'ignored' })).toEqual([
      'x',
      'is.null',
    ])
    expect(filterParam({ column: 'x', operator: 'not-null', value: '' })).toEqual([
      'x',
      'not.is.null',
    ])
  })
})

describe('restQueryString', () => {
  it('keeps plain parameters, then one parameter per filter, repeated names included', () => {
    const query = restQueryString({ limit: 50, offset: 0, select: 'id', skip: undefined }, [
      { column: 'id', operator: 'gt', value: '1' },
      { column: 'id', operator: 'lt', value: '9' },
    ])

    expect(query).toBe('limit=50&offset=0&select=id&id=gt.%221%22&id=lt.%229%22')
  })
})

describe('operators', () => {
  it('know which take a value and refuse unknown names', () => {
    expect(needsValue('eq')).toBe(true)
    expect(needsValue('is-null')).toBe(false)
    expect(isRowFilterOperator('ilike')).toBe(true)
    expect(isRowFilterOperator('drop')).toBe(false)
    expect(operatorInfo('gte').symbol).toBe('≥')
  })

  it('give equal keys to equal filter lists', () => {
    const filters = [{ column: 'a', operator: 'eq' as const, value: '1' }]

    expect(filtersKey(filters)).toBe(filtersKey([...filters]))
    expect(filtersKey([])).toBe('')
  })
})
