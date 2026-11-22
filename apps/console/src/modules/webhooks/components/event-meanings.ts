import type { WebhookEventType } from '@/modules/webhooks/components/event-types'

/** What each event means for a receiver, in one line. */
export const EVENT_TYPE_MEANINGS: Record<WebhookEventType, string> = {
  'user.created': 'Uma conta nova foi criada, por qualquer forma de cadastro.',
  'user.updated': 'Dados da conta mudaram: email, verificação, metadados ou foto.',
  'user.deleted': 'A conta foi excluída.',
  'user.banned': 'Um admin bloqueou a conta.',
  'user.unbanned': 'Um admin desbloqueou a conta.',
  'session.revoked': 'Sessões do usuário foram encerradas.',
  'audit.event': 'Um registro novo entrou no log de atividade.',
}
