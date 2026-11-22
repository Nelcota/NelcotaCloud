import type { components } from '@/shared/api/api-schema'
import type { StatusTone } from '@/shared/ui/status-badge'

type AuditAction = components['schemas']['AuditAction']

export type EventLabel = { label: string; tone: StatusTone }

/** Every event of the activity log in a few words, with how worrying it is. */
const EVENT_LABELS: Record<AuditAction, EventLabel> = {
  logged_in: { label: 'Login', tone: 'success' },
  login_failed: { label: 'Login recusado', tone: 'error' },
  login_rate_limited: { label: 'Login bloqueado por limite', tone: 'warning' },
  mfa_code_failed: { label: 'Código MFA errado', tone: 'warning' },
  refresh_token_reused: { label: 'Token reutilizado', tone: 'error' },
  logged_out: { label: 'Logout', tone: 'neutral' },
  signed_up: { label: 'Cadastro', tone: 'info' },
  email_verified: { label: 'Email verificado', tone: 'info' },
  magic_link_sent: { label: 'Magic link enviado', tone: 'neutral' },
  password_reset_requested: { label: 'Redefinição pedida', tone: 'neutral' },
  password_reset: { label: 'Senha redefinida', tone: 'neutral' },
  mfa_enabled: { label: 'MFA ativado', tone: 'neutral' },
  mfa_disabled: { label: 'MFA desativado', tone: 'warning' },
  mfa_reset: { label: 'MFA removido', tone: 'warning' },
  user_updated: { label: 'Usuário alterado', tone: 'neutral' },
  user_banned: { label: 'Usuário banido', tone: 'warning' },
  user_unbanned: { label: 'Banimento removido', tone: 'neutral' },
  user_deleted: { label: 'Usuário excluído', tone: 'warning' },
  sessions_revoked: { label: 'Sessões encerradas', tone: 'neutral' },
  api_key_created: { label: 'Chave criada', tone: 'neutral' },
  api_key_revoked: { label: 'Chave revogada', tone: 'warning' },
  settings_changed: { label: 'Configuração alterada', tone: 'neutral' },
  member_invited: { label: 'Membro convidado', tone: 'neutral' },
  member_removed: { label: 'Membro removido', tone: 'neutral' },
  member_role_changed: { label: 'Papel alterado', tone: 'neutral' },
  ownership_transferred: { label: 'Projeto transferido', tone: 'warning' },
  migration_applied: { label: 'Migração aplicada', tone: 'neutral' },
  schema_changed: { label: 'Esquema alterado', tone: 'neutral' },
  address_blocked: { label: 'IP bloqueado', tone: 'warning' },
  address_unblocked: { label: 'IP desbloqueado', tone: 'neutral' },
}

const UNKNOWN: EventLabel = { label: 'Evento', tone: 'neutral' }

/** A newer server may send an action this build does not know yet. */
export function eventLabelOf(action: AuditAction): EventLabel {
  return EVENT_LABELS[action] ?? UNKNOWN
}
