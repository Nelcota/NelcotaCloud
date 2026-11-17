import type { UserAction } from '@/modules/users/queries/use-users'

/** What the flash says once an admin action on a user worked. */
export const DONE_MESSAGES: Record<UserAction, string> = {
  ban: 'Usuário bloqueado e sessões encerradas',
  unban: 'Usuário desbloqueado',
  'end-sessions': 'Sessões encerradas',
  'reset-mfa': 'Autenticador removido',
  delete: 'Usuário excluído',
}
