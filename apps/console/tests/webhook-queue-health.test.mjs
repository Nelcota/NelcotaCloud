import assert from 'node:assert/strict'
import { test } from 'node:test'

import { observeQueue } from '../src/modules/webhooks/model/webhook-queue-health.ts'

function sample(at, age) {
  const count = { value: 1, is_capped: false }

  return {
    observed_at: new Date(at * 1000).toISOString(),
    active_endpoints: 1,
    pending: count,
    overdue: count,
    oldest_overdue_seconds: age,
    failed_last_day: { value: 0, is_capped: false },
  }
}

test('detects sustained delay across separate readings', () => {
  const first = observeQueue(sample(0, 60))
  const manualRefresh = observeQueue(sample(1, 61), first)
  const next = observeQueue(sample(30, 90), manualRefresh)

  assert.equal(first.isDelayed, false)
  assert.equal(manualRefresh.isDelayed, false)
  assert.equal(next.isDelayed, true)
})

test('clears the alert once the backlog recovers', () => {
  const first = observeQueue(sample(0, 61))
  const active = observeQueue(sample(30, 90), first)
  const improving = observeQueue(sample(60, 30), active)
  const recovered = observeQueue(sample(90, 29), improving)

  assert.equal(improving.isDelayed, true)
  assert.equal(recovered.isDelayed, false)
})

test('old and duplicate readings cannot start a new alert', () => {
  const first = observeQueue(sample(0, 60))
  const duplicate = observeQueue(sample(0, 60), first)
  const reconnected = observeQueue(sample(180, 240), duplicate)

  assert.equal(duplicate, first)
  assert.equal(reconnected.isDelayed, false)
})
