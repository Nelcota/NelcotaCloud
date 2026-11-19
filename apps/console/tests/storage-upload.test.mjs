import assert from 'node:assert/strict'
import { test } from 'node:test'

import { runUploadAttempt } from '../src/modules/storage/queries/upload-attempt.ts'

const signed = { object_id: 'reserved-object', expires_at: '2099-01-01T00:00:00Z' }

test('drops a reservation returned after the session ends', async () => {
  const controller = new AbortController()
  const attempt = { current: null }
  const response = Promise.withResolvers()
  const result = runUploadAttempt(
    attempt,
    {
      reserve: () => response.promise,
      send: () => assert.fail('a canceled reservation must not send a file'),
      confirm: () => assert.fail('a canceled reservation must not be confirmed'),
    },
    controller.signal,
  )

  controller.abort()
  response.resolve(signed)

  await assert.rejects(result, { name: 'AbortError' })
  assert.equal(attempt.current, null)
})

test('skips confirmation if the upload finishes after cancellation', async () => {
  const controller = new AbortController()
  const pending = { current: { signed, uploaded: false } }
  const bytesSent = Promise.withResolvers()
  const result = runUploadAttempt(
    pending,
    {
      reserve: () => assert.fail('the existing reservation should be reused'),
      send: () => bytesSent.promise,
      confirm: () => assert.fail('canceled transfers must not be confirmed'),
    },
    controller.signal,
  )

  controller.abort()
  bytesSent.resolve()

  await assert.rejects(result, { name: 'AbortError' })
})
