import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

export const ACTION_LABELS: Record<Schemas['AuditAction'], string> = {
  logged_in: 'Login',
  login_failed: 'Login recusado',
  password_reset: 'Senha redefinida',
  user_updated: 'Metadados alterados',
  user_banned: 'Usuário bloqueado',
  user_unbanned: 'Usuário desbloqueado',
  user_deleted: 'Usuário excluído',
  sessions_revoked: 'Sessões encerradas',
  mfa_reset: 'Autenticador removido',
  login_rate_limited: 'Limite de tentativas de login',
  mfa_code_failed: 'Código do autenticador recusado',
  refresh_token_reused: 'Token de renovação reutilizado',
  signed_up: 'Conta criada',
  email_verified: 'Email confirmado',
  logged_out: 'Logout',
  magic_link_sent: 'Link mágico enviado',
  password_reset_requested: 'Redefinição de senha solicitada',
  mfa_enabled: 'MFA ativado',
  mfa_disabled: 'MFA desativado',
  api_key_created: 'Chave de API criada',
  api_key_revoked: 'Chave de API revogada',
  settings_changed: 'Configurações alteradas',
  member_invited: 'Membro convidado',
  member_removed: 'Membro removido',
  member_role_changed: 'Função de membro alterada',
  ownership_transferred: 'Propriedade transferida',
  migration_applied: 'Migração aplicada',
  schema_changed: 'Esquema alterado',
  address_blocked: 'Endereço IP bloqueado',
  address_unblocked: 'Endereço IP desbloqueado',
}

export const METHOD_LABELS: Record<Schemas['LoginMethod'], string> = {
  password: 'senha',
  magic_link: 'link mágico',
  oauth: 'login social',
  totp: 'código do autenticador',
}

/** Where an event came from, in the log's Origem column. */
export const ORIGIN_LABELS: Record<Schemas['AuditActorKind'], string> = {
  user: 'App',
  console_account: 'Console',
  secret_key: 'Chave secreta',
}
