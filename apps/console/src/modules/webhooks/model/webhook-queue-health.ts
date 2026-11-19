import type { components } from '@/shared/api/api-schema'

export type QueueHealth = components['schemas']['QueueHealth']

const ALERT_AFTER_SECONDS = 60
const RECOVER_BELOW_SECONDS = 30
const MINIMUM_SAMPLE_GAP_MS = 25_000
const MAXIMUM_SAMPLE_GAP_MS = 90_000

export type QueueReading = {
  health: QueueHealth
  isDelayed: boolean
  breachStartedAt: number | null
}

/** Rapid refreshes update the numbers without satisfying the alert's minimum sample gap. */
export function observeQueue(health: QueueHealth, previous?: QueueReading): QueueReading {
  const observedAt = Date.parse(health.observed_at)
  const previousAt = Date.parse(previous?.health.observed_at ?? '')
  const age = health.oldest_overdue_seconds ?? 0

  if (
    previous !== undefined &&
    observedAt <= previousAt &&
    previousAt - observedAt < MAXIMUM_SAMPLE_GAP_MS
  ) {
    return previous
  }

  if (previous?.isDelayed === true && age >= RECOVER_BELOW_SECONDS) {
    return { health, isDelayed: true, breachStartedAt: null }
  }

  if (age < ALERT_AFTER_SECONDS || Number.isFinite(observedAt) === false) {
    return { health, isDelayed: false, breachStartedAt: null }
  }

  const breachStartedAt = previous?.breachStartedAt

  if (
    breachStartedAt === undefined ||
    breachStartedAt === null ||
    observedAt - breachStartedAt >= MAXIMUM_SAMPLE_GAP_MS ||
    observedAt < breachStartedAt
  ) {
    return { health, isDelayed: false, breachStartedAt: observedAt }
  }

  return {
    health,
    isDelayed: observedAt - breachStartedAt >= MINIMUM_SAMPLE_GAP_MS,
    breachStartedAt,
  }
}
