import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  parseUsersSearch,
  searchForUsersFilter,
  usersFilterOf,
} from '../src/modules/users/model/users-search.ts'

test('parseUsersSearch keeps a known status, a search and the page cursors', () => {
  const parsed = parseUsersSearch({ situacao: 'bloqueados', busca: 'ana@', paginas: 'c1,c2' })

  assert.deepEqual(parsed, { situacao: 'bloqueados', busca: 'ana@', paginas: 'c1,c2' })
})

test('parseUsersSearch drops unknown statuses, blank or too long searches and other keys', () => {
  assert.deepEqual(parseUsersSearch({ situacao: 'banned', extra: '1' }), {})
  assert.deepEqual(parseUsersSearch({ busca: '   ' }), {})
  assert.deepEqual(parseUsersSearch({ busca: 'a'.repeat(255) }), {})
  assert.deepEqual(parseUsersSearch({ busca: 42 }), {})
})

test('parseUsersSearch drops the page when any cursor is malformed or there are too many', () => {
  assert.deepEqual(parseUsersSearch({ paginas: ['c1'] }), {})
  assert.deepEqual(parseUsersSearch({ paginas: 3 }), {})
  assert.deepEqual(parseUsersSearch({ paginas: 'c1,' }), {})
  assert.deepEqual(parseUsersSearch({ paginas: 'x'.repeat(257) }), {})
  assert.deepEqual(
    parseUsersSearch({ paginas: Array.from({ length: 201 }, () => 'c').join(',') }),
    {},
  )
})

test('usersFilterOf defaults to everyone on the first page with no search', () => {
  assert.deepEqual(usersFilterOf({}), {
    search: '',
    status: 'all',
    order: 'created_at',
    cursors: [],
  })
  assert.deepEqual(usersFilterOf({ situacao: 'nao-confirmados', busca: 'x', paginas: 'c1' }), {
    search: 'x',
    status: 'unverified',
    order: 'created_at',
    cursors: ['c1'],
  })
})

test('searchForUsersFilter writes the shortest URL and round-trips', () => {
  assert.deepEqual(
    searchForUsersFilter({ search: ' ', status: 'all', order: 'created_at', cursors: [] }),
    {},
  )

  const filter = { search: 'gmail', status: 'banned', order: 'last_sign_in', cursors: ['c1', 'c2'] }
  const search = searchForUsersFilter(filter)

  assert.deepEqual(search, {
    situacao: 'bloqueados',
    busca: 'gmail',
    ordem: 'ultimo-login',
    paginas: 'c1,c2',
  })
  assert.deepEqual(usersFilterOf(parseUsersSearch(search)), filter)
})

test('parseUsersSearch keeps only the known order word', () => {
  assert.deepEqual(parseUsersSearch({ ordem: 'ultimo-login' }), { ordem: 'ultimo-login' })
  assert.deepEqual(parseUsersSearch({ ordem: 'last_sign_in' }), {})
  assert.equal(usersFilterOf({ ordem: 'qualquer' }).order, 'created_at')
})
