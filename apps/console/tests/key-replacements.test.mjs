import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  inferReplacements,
  replacementName,
} from '../src/modules/api-keys/model/key-replacements.ts'

function key(id, { name = '', hint, kind = 'secret' }) {
  return { id, name, hint, kind }
}

test('names a replacement after the key it replaces', () => {
  assert.equal(replacementName({ name: '', hint: 'cc11' }), 'Substitui …cc11')
  assert.equal(replacementName({ name: 'API', hint: 'cc11' }), 'API (substitui …cc11)')
  assert.ok(replacementName({ name: 'x'.repeat(64), hint: 'cc11' }).length <= 64)
})

test('pairs a replacement with the old key from the names alone', () => {
  const keys = [
    key('old', { hint: 'cc11' }),
    key('new', { name: 'Substitui …cc11', hint: 'ab12' }),
    key('named-old', { name: 'API', hint: '6cd0' }),
    key('named-new', { name: 'API (substitui …6cd0)', hint: 'ef34' }),
  ]

  assert.deepEqual(
    [...inferReplacements(keys)],
    [
      ['old', 'new'],
      ['named-old', 'named-new'],
    ],
  )
})

test('ignores replacements whose old key is gone or of another kind', () => {
  const keys = [
    key('new', { name: 'Substitui …cc11', hint: 'ab12' }),
    key('app', { hint: 'cc11', kind: 'publishable' }),
  ]

  assert.equal(inferReplacements(keys).size, 0)
})
