import assert from 'node:assert/strict'
import { test } from 'node:test'

import { describeNamedRefusal } from '../src/shared/api/data-error-messages.ts'

test('names the constraint a write broke', () => {
  assert.equal(
    describeNamedRefusal(
      'unique_violation',
      'the value conflicts with unique constraint posts_slug_key',
    ),
    'Já existe uma linha com esse valor (restrição posts_slug_key). Use outro valor.',
  )
  assert.match(
    describeNamedRefusal(
      'foreign_key_violation',
      'the row references or is referenced by another row (constraint posts_author_fkey)',
    ),
    /restrição posts_author_fkey/,
  )
  assert.match(
    describeNamedRefusal('check_violation', 'the value breaks check constraint price_positive'),
    /regra price_positive/,
  )
})

test('names the required column that was left empty', () => {
  assert.equal(
    describeNamedRefusal(
      'not_null_violation',
      'a required column was left empty (constraint title)',
    ),
    'A coluna title é obrigatória. Preencha um valor.',
  )
})

test('names a column that no longer exists', () => {
  assert.equal(
    describeNamedRefusal('column_not_found', 'column subtitle does not exist'),
    'A coluna subtitle não existe mais. Recarregue a página.',
  )
})

test('falls back to an unnamed sentence when the API names nothing', () => {
  assert.equal(
    describeNamedRefusal('not_null_violation', 'a required column was left empty (constraint )'),
    'Uma coluna obrigatória ficou vazia. Preencha um valor.',
  )
})

test('leaves other codes to the general messages', () => {
  assert.equal(describeNamedRefusal('permission_denied', 'permission denied'), null)
})
