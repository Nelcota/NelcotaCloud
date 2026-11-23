import type { CommandContext } from '../cli/command-context'

const POLL_INTERVAL_MS = 1_000
const REQUEST_TIMEOUT_MS = 2_000

export type HealthClock = Pick<CommandContext, 'fetch' | 'now' | 'sleep'>

/** Polls `GET /health` until it answers 200 or `timeoutMs` passes. */
export function waitForHealth(
  apiUrl: string,
  clock: HealthClock,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = clock.now().getTime() + timeoutMs

  return pollUntil(`${apiUrl}/health`, clock, deadline)
}

async function pollUntil(url: string, clock: HealthClock, deadline: number): Promise<boolean> {
  if (await isHealthy(url, clock)) {
    return true
  }

  if (clock.now().getTime() >= deadline) {
    return false
  }

  await clock.sleep(POLL_INTERVAL_MS)

  return pollUntil(url, clock, deadline)
}

function isHealthy(url: string, clock: HealthClock): Promise<boolean> {
  return clock
    .fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    .then(async (response) => {
      await response.body?.cancel()

      return response.ok
    })
    .catch(() => false)
}
