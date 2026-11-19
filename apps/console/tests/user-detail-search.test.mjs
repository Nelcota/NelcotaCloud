import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  parseUserDetailSearch,
  searchForUserTab,
  tabFromWord,
  userTabFromId,
  userTabOf,
} from '../src/modules/users/model/user-detail-search.ts'

test('parseUserDetailSearch keeps a known tab and drops the rest', () => {
  assert.deepEqual(parseUserDetailSearch({ aba: 'sessoes', extra: 1 }), { aba: 'sessoes' })
  assert.deepEqual(parseUserDetailSearch({ aba: 'sessions' }), {})
  assert.deepEqual(parseUserDetailSearch({ aba: 3 }), {})
  assert.deepEqual(parseUserDetailSearch({}), {})
})

test('tabFromWord opens the overview for anything unknown', () => {
  assert.equal(tabFromWord('atividade'), 'activity')
  assert.equal(tabFromWord('metadados'), 'metadata')
  assert.equal(tabFromWord(undefined), 'overview')
  assert.equal(tabFromWord('qualquer'), 'overview')
})

test('searchForUserTab writes the bare page for the overview and round-trips', () => {
  assert.deepEqual(searchForUserTab('overview'), {})

  for (const tab of ['activity', 'sessions', 'metadata']) {
    assert.equal(userTabOf(parseUserDetailSearch(searchForUserTab(tab))), tab)
  }
})

test('userTabFromId accepts the tab ids and falls back to the overview', () => {
  assert.equal(userTabFromId('sessions'), 'sessions')
  assert.equal(userTabFromId('nope'), 'overview')
})
