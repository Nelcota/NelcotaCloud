import { ACTION_LABELS } from '@/modules/activity/components/audit-labels'
import type { components } from '@/shared/api/api-schema'
import type { StatusTone } from '@/shared/ui/status-badge'

type AuditAction = components['schemas']['AuditAction']

export type EventLabel = { label: string; tone: StatusTone }

/** How worrying each event is; the words come from the activity log so both pages agree. */
const EVENT_TONES: Record<AuditAction, StatusTone> = {
  logged_in: 'success',
  login_failed: 'error',
  login_rate_limited: 'warning',
  mfa_code_failed: 'warning',
  refresh_token_reused: 'error',
  logged_out: 'neutral',
  signed_up: 'info',
  email_verified: 'info',
  magic_link_sent: 'neutral',
  password_reset_requested: 'neutral',
  password_reset: 'neutral',
  mfa_enabled: 'neutral',
  mfa_disabled: 'warning',
  mfa_reset: 'warning',
  user_updated: 'neutral',
  user_banned: 'warning',
  user_unbanned: 'neutral',
  user_deleted: 'warning',
  sessions_revoked: 'neutral',
  api_key_created: 'neutral',
  api_key_revoked: 'warning',
  settings_changed: 'neutral',
  member_invited: 'neutral',
  member_removed: 'neutral',
  member_role_changed: 'neutral',
  ownership_transferred: 'warning',
  migration_applied: 'neutral',
  schema_changed: 'neutral',
  address_blocked: 'warning',
  address_unblocked: 'neutral',
}

const UNKNOWN: EventLabel = { label: 'Evento', tone: 'neutral' }

/** A newer server may send an action this build does not know yet. */
export function eventLabelOf(action: AuditAction): EventLabel {
  const label = ACTION_LABELS[action]
  const tone = EVENT_TONES[action]

  if (label === undefined || tone === undefined) {
    return UNKNOWN
  }

  return { label, tone }
}
