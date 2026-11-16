import { nelcota } from '@/shared/auth/nelcota'

/** Signs one device out. */
export function revokeSession(sessionId: string): Promise<void> {
  return nelcota.auth.sessions.revoke(sessionId)
}
