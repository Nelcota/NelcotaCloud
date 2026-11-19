import KeyMinimalistic from '~icons/solar/key-minimalistic-2-linear'
import Login from '~icons/solar/login-3-linear'
import Logout from '~icons/solar/logout-3-linear'
import PenNewSquare from '~icons/solar/pen-new-square-linear'
import ShieldCross from '~icons/solar/shield-cross-linear'
import Smartphone from '~icons/solar/smartphone-2-linear'
import TrashBin from '~icons/solar/trash-bin-minimalistic-linear'
import UserBlock from '~icons/solar/user-block-linear'
import UserCheck from '~icons/solar/user-check-linear'

import type { components } from '@/shared/api/api-schema'
import type { IconComponent } from '@/shared/ui/icon-component'

type AuditAction = components['schemas']['AuditAction']

/** One icon per kind of event, so the log can be scanned without reading every line. */
export const ACTION_ICONS: Record<AuditAction, IconComponent> = {
  logged_in: Login,
  login_failed: ShieldCross,
  login_rate_limited: ShieldCross,
  mfa_code_failed: ShieldCross,
  refresh_token_reused: ShieldCross,
  signed_up: UserCheck,
  email_verified: UserCheck,
  logged_out: Logout,
  magic_link_sent: Login,
  password_reset_requested: KeyMinimalistic,
  password_reset: KeyMinimalistic,
  user_updated: PenNewSquare,
  user_banned: UserBlock,
  user_unbanned: UserCheck,
  user_deleted: TrashBin,
  sessions_revoked: Logout,
  mfa_reset: Smartphone,
  mfa_enabled: Smartphone,
  mfa_disabled: Smartphone,
  api_key_created: KeyMinimalistic,
  api_key_revoked: KeyMinimalistic,
  settings_changed: PenNewSquare,
  member_invited: UserCheck,
  member_removed: UserBlock,
  member_role_changed: PenNewSquare,
  ownership_transferred: PenNewSquare,
  migration_applied: PenNewSquare,
  schema_changed: PenNewSquare,
  address_blocked: ShieldCross,
  address_unblocked: ShieldCross,
}
