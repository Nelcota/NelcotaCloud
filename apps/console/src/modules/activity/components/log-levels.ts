import type { components } from '@/shared/api/api-schema'
import type { LogLevel } from '@/shared/ui/level-badge'

type AuditAction = components['schemas']['AuditAction']

/** A reused refresh token means someone else may hold the session: the one real alarm. */
const ERRORS: readonly AuditAction[] = ['refresh_token_reused']

/** Refused attempts: worth a look, but usually a typo or a forgotten code. */
const WARNINGS: readonly AuditAction[] = ['login_failed', 'mfa_code_failed', 'login_rate_limited']

/** The level a log line shows for an event. */
export function levelOf(action: AuditAction): LogLevel {
  if (ERRORS.includes(action)) {
    return 'error'
  }

  if (WARNINGS.includes(action)) {
    return 'warn'
  }

  return 'info'
}
