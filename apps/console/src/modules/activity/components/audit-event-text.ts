import {
  ACTION_LABELS,
  METHOD_LABELS,
  ORIGIN_LABELS,
} from '@/modules/activity/components/audit-labels'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

/** What happened, with the login method when there is one ("Login com senha"). */
export function actionText(event: AuditEvent): string {
  const label = ACTION_LABELS[event.action]

  if (event.login_method === null || event.login_method === undefined) {
    return label
  }

  return `${label} com ${METHOD_LABELS[event.login_method]}`
}

/** Who acted: the user, the secret key, or the team member (by email) who used the console. */
export function actorText(event: AuditEvent, memberEmails: ReadonlyMap<string, string>): string {
  if (event.actor === 'user') {
    return 'Usuário'
  }

  if (event.actor === 'secret_key') {
    return 'Chave secreta'
  }

  const accountId = event.actor_account_id ?? ''

  return memberEmails.get(accountId) || 'Ex-membro da equipe'
}

/** Where the request came from: "App", "Chave secreta" or "Console · você". */
export function originText(event: AuditEvent, context: AuditRowContext): string {
  const origin = ORIGIN_LABELS[event.actor]

  if (event.actor !== 'console_account') {
    return origin
  }

  return `${origin} · ${memberName(event, context)}`
}

function memberName(event: AuditEvent, context: AuditRowContext): string {
  const accountId = event.actor_account_id ?? ''

  if (accountId !== '' && accountId === context.currentAccountId) {
    return 'você'
  }

  return context.memberEmails.get(accountId) ?? 'ex-membro'
}
