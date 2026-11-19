import assert from 'node:assert/strict'
import { test } from 'node:test'

import { deviceSummary } from '../src/modules/activity/model/device-summary.ts'
import { detailEntries, detailSubject } from '../src/modules/activity/model/event-details.ts'

const CHROME_ON_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36'

test('names the browser and system of a user agent, and nothing for a library', () => {
  assert.equal(deviceSummary(CHROME_ON_WINDOWS), 'Chrome 131 · Windows 10')
  assert.equal(deviceSummary('nelcota-tests/1.0'), null)
  assert.equal(deviceSummary('  '), null)
  assert.equal(deviceSummary(null), null)
})

test('lists known details in words and leaves unknown fields out', () => {
  const details = { section: 'smtp', operation: 'reset', secret: 'never shown', fields: [] }

  assert.deepEqual(detailEntries(details), [
    { label: 'Área', value: 'SMTP' },
    { label: 'Operação', value: 'Restaurado ao padrão' },
  ])
  assert.deepEqual(detailEntries({ rls_enabled: false, version: 3 }), [
    { label: 'Versão', value: '3' },
    { label: 'RLS', value: 'Desligado' },
  ])
  assert.deepEqual(detailEntries(null), [])
})

test('picks the fact that names what changed', () => {
  assert.equal(detailSubject({ key_id: 'k1', name: 'App iOS', kind: 'publishable' }), 'App iOS')
  assert.equal(detailSubject({ operation: 'drop_table', table: 'orders' }), 'orders')
  assert.equal(detailSubject({ section: 'email_template' }), 'Modelo de e-mail')
  assert.equal(detailSubject({ key_id: 'k1' }), null)
  assert.equal(detailSubject(undefined), null)
})
