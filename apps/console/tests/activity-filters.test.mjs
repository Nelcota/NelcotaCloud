import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  activityFilterOf,
  parseActivitySearch,
  searchForFilter,
} from '../src/modules/activity/model/activity-search.ts'
import { dayRangeOf, periodQuery } from '../src/modules/activity/model/activity-period.ts'
import {
  burstEmails,
  groupFailedLogins,
} from '../src/modules/activity/model/failed-login-bursts.ts'
import { suspiciousAddresses } from '../src/modules/activity/model/suspicious-addresses.ts'

const MINUTE = 60_000
const START = Date.parse('2026-11-18T14:30:00Z')

function event(id, action, { minutesAgo, ip = '45.83.12.9', email = 'ana@acme.com' }) {
  return {
    id,
    action,
    email,
    ip_address: ip,
    actor: 'user',
    occurred_at: new Date(START - minutesAgo * MINUTE).toISOString(),
  }
}

function kinds(entries) {
  return entries.map((entry) => entry.event?.id ?? entry.events.length)
}

test('folds attempts on many accounts from one IP and lists each account once', () => {
  const events = [
    event(3, 'login_failed', { minutesAgo: 0, email: 'ana@acme.com' }),
    event(2, 'login_failed', { minutesAgo: 1, email: 'bia@acme.com' }),
    event(1, 'login_failed', { minutesAgo: 2, email: 'ana@acme.com' }),
  ]
  const entries = groupFailedLogins(events)

  assert.deepEqual(kinds(entries), [3])
  assert.deepEqual(burstEmails(entries[0].events), ['ana@acme.com', 'bia@acme.com'])
})

test('folds three or more refused logins in a row from the same IP', () => {
  const events = [
    event(6, 'logged_in', { minutesAgo: 0 }),
    event(5, 'login_failed', { minutesAgo: 1 }),
    event(4, 'login_failed', { minutesAgo: 3 }),
    event(3, 'login_failed', { minutesAgo: 5 }),
    event(2, 'login_failed', { minutesAgo: 7 }),
    event(1, 'user_banned', { minutesAgo: 9 }),
  ]

  assert.deepEqual(kinds(groupFailedLogins(events)), [6, 4, 1])
})

test('keeps two attempts as separate lines', () => {
  const events = [
    event(2, 'login_failed', { minutesAgo: 0 }),
    event(1, 'login_failed', { minutesAgo: 1 }),
  ]

  assert.deepEqual(kinds(groupFailedLogins(events)), [2, 1])
})

test('splits attempts from another IP or after a long pause', () => {
  const events = [
    event(5, 'login_failed', { minutesAgo: 0 }),
    event(4, 'login_failed', { minutesAgo: 1 }),
    event(3, 'login_failed', { minutesAgo: 2, ip: '10.0.0.1' }),
    event(2, 'login_failed', { minutesAgo: 30 }),
    event(1, 'login_failed', { minutesAgo: 31 }),
  ]

  assert.deepEqual(kinds(groupFailedLogins(events)), [5, 4, 3, 2, 1])
})

test('reads only known filters from the URL', () => {
  assert.deepEqual(parseActivitySearch({ periodo: '24h', tipo: 'recusados', busca: '45.83' }), {
    periodo: '24h',
    tipo: 'recusados',
    busca: '45.83',
  })
  assert.deepEqual(parseActivitySearch({ periodo: '2d', tipo: 'tudo', busca: 'a'.repeat(255) }), {})
  assert.deepEqual(parseActivitySearch({ busca: 42 }), {})
})

test('round-trips a filter through the URL and leaves defaults out', () => {
  const filter = { period: 30, kind: 'changes', search: 'ana' }
  const ranged = { period: { from: '2026-11-12', to: '2026-11-18' }, kind: 'all', search: '' }

  assert.deepEqual(activityFilterOf(searchForFilter(filter)), filter)
  assert.deepEqual(activityFilterOf(searchForFilter(ranged)), ranged)
  assert.deepEqual(searchForFilter(ranged), { de: '2026-11-12', ate: '2026-11-18' })
  assert.deepEqual(searchForFilter({ period: 7, kind: 'all', search: '' }), {})
  assert.deepEqual(activityFilterOf({}), { period: 7, kind: 'all', search: '' })
})

test('keeps only real, ordered day ranges no longer than the log', () => {
  assert.deepEqual(dayRangeOf('2026-11-18', '2026-11-18'), { from: '2026-11-18', to: '2026-11-18' })
  assert.equal(dayRangeOf('2026-11-18', '2026-11-12'), undefined)
  assert.equal(dayRangeOf('2026-02-30', '2026-03-02'), undefined)
  assert.equal(dayRangeOf('2026-11-1', '2026-11-18'), undefined)
  assert.equal(dayRangeOf('2026-11-12', undefined), undefined)
  assert.notEqual(dayRangeOf('2026-08-20', '2026-11-18'), undefined)
  assert.equal(dayRangeOf('2026-08-19', '2026-11-18'), undefined)
  assert.deepEqual(parseActivitySearch({ de: '2026-11-18', ate: '2026-11-12', periodo: '30d' }), {
    periodo: '30d',
  })
})

test('sends a range from the first local midnight to the one after the last day', () => {
  const query = periodQuery({ from: '2026-11-12', to: '2026-11-18' })

  assert.equal(query.from, new Date(2026, 10, 12).toISOString())
  assert.equal(query.to, new Date(2026, 10, 19).toISOString())
  assert.deepEqual(periodQuery(7), { days: 7 })
})

function address(ip, failures, accounts) {
  return { ip_address: ip, failures, accounts, last_seen_at: '2026-11-18T14:30:00Z' }
}

test('flags only addresses that guess, not users who mistype', () => {
  const addresses = [address('a', 1, 1), address('b', 5, 1), address('c', 3, 3), address('d', 4, 2)]

  assert.deepEqual(
    suspiciousAddresses(addresses).map((entry) => entry.ip_address),
    ['b', 'c'],
  )
})
