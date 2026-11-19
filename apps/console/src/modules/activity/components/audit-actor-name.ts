import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

/** Whoever sent these never proved to be the user: a guess, a throttled try, an old token. */
const UNPROVEN_ACTIONS: ReadonlySet<AuditEvent['action']> = new Set([
  'login_failed',
  'login_rate_limited',
  'mfa_code_failed',
  'refresh_token_reused',
])

/**
 * Who did it, in plain words. A refused login was made by someone who could not prove to be
 * the user, so it is never credited to the account's owner.
 */
export function actorName(event: AuditEvent, memberEmails: ReadonlyMap<string, string>): string {
  if (UNPROVEN_ACTIONS.has(event.action)) {
    return 'Desconhecido'
  }

  if (event.actor === 'user') {
    return 'O próprio usuário'
  }

  if (event.actor === 'secret_key') {
    return 'Servidor (chave secreta)'
  }

  const accountId = event.actor_account_id ?? ''

  return memberEmails.get(accountId) || 'Alguém que saiu da equipe'
}
