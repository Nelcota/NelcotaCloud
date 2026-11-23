import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  blankDraft,
  draftMissing,
  eventLabel,
  toggleEvent,
} from '../src/modules/notifications/model/notification-events.ts'

test('a new channel starts as an email with every alert ticked', () => {
  const draft = blankDraft()

  assert.equal(draft.kind, 'email')
  assert.equal(draft.target, '')
  assert.deepEqual(draft.events, [
    'webhook_failing',
    'login_failures',
    'data_api_errors',
    'storage_near_limit',
  ])
})

test('a draft waits for its destination, then for at least one alert', () => {
  assert.equal(draftMissing({ ...blankDraft(), target: '  ' }), 'Preencha o endereço de email')
  assert.equal(
    draftMissing({ kind: 'slack', target: '', events: ['login_failures'] }),
    'Preencha a URL do webhook',
  )
  assert.equal(
    draftMissing({ kind: 'email', target: 'a@b.co', events: [] }),
    'Escolha pelo menos um aviso',
  )
  assert.equal(draftMissing({ ...blankDraft(), target: 'a@b.co' }), null)
})

test('toggling an alert keeps the others', () => {
  assert.deepEqual(toggleEvent(['login_failures'], 'webhook_failing', true), [
    'login_failures',
    'webhook_failing',
  ])
  assert.deepEqual(toggleEvent(['login_failures', 'webhook_failing'], 'login_failures', false), [
    'webhook_failing',
  ])
  assert.deepEqual(toggleEvent(['login_failures'], 'login_failures', true), ['login_failures'])
})

test('names each alert in Portuguese', () => {
  assert.equal(eventLabel('data_api_errors'), 'Erros na Data API')
})
