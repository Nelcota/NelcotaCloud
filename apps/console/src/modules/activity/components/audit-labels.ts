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
}

export const METHOD_LABELS: Record<Schemas['LoginMethod'], string> = {
  password: 'senha',
  magic_link: 'link mágico',
  oauth: 'login social',
  totp: 'código do autenticador',
}
