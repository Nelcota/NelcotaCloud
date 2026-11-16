import type { SessionSummary } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

/** The devices where the console account is signed in. */
export function listSessions(): Promise<SessionSummary[]> {
  return nelcota.auth.sessions.list()
}
