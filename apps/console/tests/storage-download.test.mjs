import assert from 'node:assert/strict'
import { test } from 'node:test'

import { downloadForSession } from '../src/modules/storage/queries/download-for-session.ts'

function fakeAuth() {
  const listeners = new Set()

  return {
    getSession: () => ({}),
    onAuthStateChange(listener) {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    emit(event) {
      for (const listener of listeners) {
        listener(event)
      }
    },
    listeners,
  }
}

test('discards a signed download that arrives after logout and another sign-in', async () => {
  const auth = fakeAuth()
  const controller = new AbortController()
  const response = Promise.withResolvers()
  const navigated = []
  const pending = downloadForSession(auth, controller, {
    request: () => response.promise,
    navigate: (url) => navigated.push(url),
  })

  auth.emit('SIGNED_OUT')
  auth.emit('SIGNED_IN')
  response.resolve('https://storage.example.test/private')
  await pending

  assert.equal(controller.signal.aborted, true)
  assert.deepEqual(navigated, [])
  assert.equal(auth.listeners.size, 0)
})

test('allows the download to finish when the access token refreshes', async () => {
  const auth = fakeAuth()
  const controller = new AbortController()
  const response = Promise.withResolvers()
  const navigated = []
  const pending = downloadForSession(auth, controller, {
    request: () => response.promise,
    navigate: (url) => navigated.push(url),
  })

  auth.emit('TOKEN_REFRESHED')
  response.resolve('https://storage.example.test/private')
  await pending

  assert.deepEqual(navigated, ['https://storage.example.test/private'])
  assert.equal(auth.listeners.size, 0)
})
