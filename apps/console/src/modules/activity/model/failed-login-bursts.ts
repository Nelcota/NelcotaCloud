import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

/**
 * One line of the log: a single event, or refused logins in a row from the same IP. The IP is
 * the unit, not the email: one address trying many accounts is the attack worth seeing.
 */
export type ActivityEntry =
  | { kind: 'event'; event: AuditEvent }
  | { kind: 'burst'; events: AuditEvent[] }

/** Fewer attempts read as someone mistyping a password, not worth folding. */
const MIN_BURST_SIZE = 3
/** Attempts further apart than this are separate tries, not one burst. */
const BURST_GAP_MILLISECONDS = 10 * 60 * 1000

/** Folds refused logins in a row into one entry; events arrive newest first. */
export function groupFailedLogins(events: readonly AuditEvent[]): ActivityEntry[] {
  const runs: AuditEvent[][] = []

  for (const event of events) {
    const run = runs.at(-1)

    if (run !== undefined && continuesRun(run, event)) {
      run.push(event)
      continue
    }

    runs.push([event])
  }

  return runs.flatMap(entriesOf)
}

/** The distinct emails a burst tried, in the order they first appear. */
export function burstEmails(events: readonly AuditEvent[]): string[] {
  const emails = events.map((event) => event.email ?? '').filter((email) => email !== '')

  return Array.from(new Set(emails))
}

function continuesRun(run: readonly AuditEvent[], event: AuditEvent): boolean {
  const last = run.at(-1)

  if (last === undefined || event.action !== 'login_failed' || last.action !== 'login_failed') {
    return false
  }

  const address = event.ip_address ?? null
  const gap = Date.parse(last.occurred_at) - Date.parse(event.occurred_at)

  return address !== null && address === last.ip_address && gap <= BURST_GAP_MILLISECONDS
}

function entriesOf(run: AuditEvent[]): ActivityEntry[] {
  if (run.length < MIN_BURST_SIZE) {
    return run.map((event) => ({ kind: 'event', event }))
  }

  return [{ kind: 'burst', events: run }]
}
