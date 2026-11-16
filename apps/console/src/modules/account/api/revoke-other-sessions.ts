import { nelcota } from '@/shared/auth/nelcota'

/** Signs out every device except this one. */
export function revokeOtherSessions(): Promise<void> {
  return nelcota.auth.sessions.revokeOthers()
}
