import Database from '~icons/solar/database-linear'
import Forbidden from '~icons/solar/forbidden-circle-linear'
import Key from '~icons/solar/key-linear'
import Letter from '~icons/solar/letter-linear'
import Lock from '~icons/solar/lock-password-linear'
import Login from '~icons/solar/login-3-linear'
import Logout from '~icons/solar/logout-2-linear'
import Settings from '~icons/solar/settings-linear'
import ShieldCheck from '~icons/solar/shield-check-linear'
import ShieldWarning from '~icons/solar/shield-warning-linear'
import User from '~icons/solar/user-linear'
import UserPlus from '~icons/solar/user-plus-linear'
import Users from '~icons/solar/users-group-rounded-linear'

import type { components } from '@/shared/api/api-schema'
import type { IconComponent } from '@/shared/ui/icon-component'

type AuditAction = components['schemas']['AuditAction']

/** The glyph of each kind of event, so a scan down the log reads by subject. */
export const ACTION_ICONS: Record<AuditAction, IconComponent> = {
  logged_in: Login,
  login_failed: ShieldWarning,
  password_reset: Lock,
  user_updated: User,
  user_banned: Forbidden,
  user_unbanned: User,
  user_deleted: User,
  sessions_revoked: Logout,
  mfa_reset: ShieldCheck,
  login_rate_limited: ShieldWarning,
  mfa_code_failed: ShieldWarning,
  refresh_token_reused: ShieldWarning,
  signed_up: UserPlus,
  email_verified: Letter,
  logged_out: Logout,
  magic_link_sent: Letter,
  password_reset_requested: Lock,
  mfa_enabled: ShieldCheck,
  mfa_disabled: ShieldCheck,
  api_key_created: Key,
  api_key_revoked: Key,
  settings_changed: Settings,
  member_invited: Users,
  member_removed: Users,
  member_role_changed: Users,
  ownership_transferred: Users,
  migration_applied: Database,
  schema_changed: Database,
  address_blocked: Forbidden,
  address_unblocked: Forbidden,
}

/** The color of a row's icon: refused access in red, sensitive changes in amber. */
export type EventTone = 'failure' | 'security' | 'neutral'

const FAILURES: readonly AuditAction[] = [
  'login_failed',
  'mfa_code_failed',
  'refresh_token_reused',
  'login_rate_limited',
]

const SENSITIVE: readonly AuditAction[] = [
  'user_banned',
  'address_blocked',
  'mfa_reset',
  'mfa_disabled',
  'sessions_revoked',
  'password_reset',
  'api_key_revoked',
  'ownership_transferred',
]

export function toneOf(action: AuditAction): EventTone {
  if (FAILURES.includes(action)) {
    return 'failure'
  }

  if (SENSITIVE.includes(action)) {
    return 'security'
  }

  return 'neutral'
}
