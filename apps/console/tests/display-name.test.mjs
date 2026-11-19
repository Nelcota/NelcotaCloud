import assert from 'node:assert/strict'
import { test } from 'node:test'

import { displayNameOf } from '../src/modules/users/model/display-name.ts'

test('displayNameOf prefers name, then full_name', () => {
  assert.equal(displayNameOf({ name: 'Bia', full_name: 'Beatriz Souza' }), 'Bia')
  assert.equal(displayNameOf({ full_name: ' Beatriz Souza ' }), 'Beatriz Souza')
})

test('displayNameOf ignores blank, long and non-text values', () => {
  assert.equal(displayNameOf({ name: '   ' }), null)
  assert.equal(displayNameOf({ name: 42 }), null)
  assert.equal(displayNameOf({ name: 'a'.repeat(121) }), null)
  assert.equal(displayNameOf({}), null)
  assert.equal(displayNameOf({ name: ' ', full_name: 'Ana' }), 'Ana')
})
