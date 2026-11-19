import { detailSubject } from '@/modules/activity/model/event-details'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']
type AuditEvent = Schemas['AuditEvent']

export const ACTION_LABELS: Record<Schemas['AuditAction'], string> = {
  logged_in: 'Login',
  login_failed: 'Login recusado',
  login_rate_limited: 'Limite de tentativas de login atingido',
  mfa_code_failed: 'Código do autenticador recusado',
  refresh_token_reused: 'Token de renovação reutilizado',
  signed_up: 'Conta criada',
  email_verified: 'E-mail confirmado',
  logged_out: 'Logout',
  magic_link_sent: 'Link de login enviado',
  password_reset_requested: 'Redefinição de senha solicitada',
  password_reset: 'Senha redefinida',
  user_updated: 'Dados do usuário alterados',
  user_banned: 'Usuário bloqueado',
  user_unbanned: 'Usuário desbloqueado',
  user_deleted: 'Usuário excluído',
  sessions_revoked: 'Sessões encerradas',
  mfa_reset: 'Autenticador removido',
  mfa_enabled: 'Autenticador ativado',
  mfa_disabled: 'Autenticador desativado',
  api_key_created: 'Chave de API criada',
  api_key_revoked: 'Chave de API revogada',
  settings_changed: 'Configuração do projeto alterada',
  member_invited: 'Convite enviado',
  member_removed: 'Membro removido',
  member_role_changed: 'Permissão de membro alterada',
  ownership_transferred: 'Propriedade transferida',
  migration_applied: 'Migração aplicada',
  schema_changed: 'Esquema do banco alterado',
  address_blocked: 'IP bloqueado',
  address_unblocked: 'IP desbloqueado',
}

/** How a login was made, completing its label ("Login com senha", "Login social"). */
const METHOD_PHRASES: Record<Schemas['LoginMethod'], string> = {
  password: 'com senha',
  magic_link: 'com link mágico',
  oauth: 'social',
  totp: 'com código do autenticador',
}

export function actionText(event: AuditEvent): string {
  const label = ACTION_LABELS[event.action]
  const subject = detailSubject(event.details)

  if (event.action === 'login_failed') {
    return `${label}: ${failureReason(event)}`
  }

  if (subject !== null) {
    return `${label}: ${subject}`
  }

  if (event.login_method === null || event.login_method === undefined) {
    return label
  }

  return `${label} ${METHOD_PHRASES[event.login_method]}`
}

/**
 * Why a login was refused. Only wrong credentials are recorded, and the log keeps whether the
 * typed address named an account, which tells a forgotten password from a guessed email.
 */
export function failureReason(event: AuditEvent): string {
  if (event.user_id !== null && event.user_id !== undefined) {
    return 'senha incorreta'
  }

  if (event.email !== null && event.email !== undefined) {
    return 'e-mail sem conta'
  }

  return 'e-mail inválido'
}
