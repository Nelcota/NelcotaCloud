import Users from '~icons/solar/users-group-rounded-linear'

import { ACCOUNT_STATE_LABELS, type AccountState } from '@/modules/users/model/account-state'
import type { BulkAction } from '@/modules/users/queries/use-bulk-user-action'
import type { ConfirmChange } from '@/shared/ui/confirm-change'

/** Who a bulk action reaches, as the dialog names them. */
export type BulkSubject = {
  emails: readonly string[]
  /** The state they all share; `null` when the picked users differ. */
  sharedState: AccountState | null
}

/** One sentence in its two numbers: one person, or several. */
type Wording = { one: string; many: string }

type BulkConfirmation = {
  /** Completes the title: "Bloquear 3 usuários?". */
  verb: string
  /** Follows the names: "… não consegue mais entrar". */
  consequence: Wording
  confirmLabel: Wording
  isDestructive: boolean
  /** The state after the action; `null` when the account's state does not change (a resend). */
  toState: Wording | null
  /** Completes the flash: "3 usuários bloqueados". */
  done: Wording
}

/** A shared state as the preview names several accounts in it. */
const PLURAL_STATES: Record<AccountState, string> = {
  active: 'Ativos',
  unverified: 'Email não confirmado',
  banned: 'Bloqueados',
}

/** How many emails a dialog lists before "e mais N". */
const LISTED_EMAILS = 5

/** The same decisions as for one user, worded for one or several. */
export const BULK_CONFIRMATIONS: Record<BulkAction, BulkConfirmation> = {
  'resend-verification': {
    verb: 'Reenviar a confirmação para',
    consequence: {
      one: 'recebe de novo o email com o link de confirmação.',
      many: 'recebem de novo o email com o link de confirmação.',
    },
    confirmLabel: { one: 'Reenviar confirmação', many: 'Reenviar confirmação' },
    isDestructive: false,
    toState: null,
    done: { one: 'com confirmação reenviada', many: 'com confirmação reenviada' },
  },
  unban: {
    verb: 'Desbloquear',
    consequence: {
      one: 'volta a conseguir entrar no seu app.',
      many: 'voltam a conseguir entrar no seu app.',
    },
    confirmLabel: { one: 'Desbloquear', many: 'Desbloquear' },
    isDestructive: false,
    toState: { one: 'Ativo', many: 'Ativos' },
    done: { one: 'desbloqueado', many: 'desbloqueados' },
  },
  'end-sessions': {
    verb: 'Encerrar as sessões de',
    consequence: {
      one: 'sai de todos os dispositivos e precisa entrar de novo. A conta continua ativa.',
      many: 'saem de todos os dispositivos e precisam entrar de novo. As contas continuam ativas.',
    },
    confirmLabel: { one: 'Encerrar sessões', many: 'Encerrar sessões' },
    isDestructive: false,
    toState: { one: 'Desconectado', many: 'Desconectados' },
    done: { one: 'com sessões encerradas', many: 'com sessões encerradas' },
  },
  ban: {
    verb: 'Bloquear',
    consequence: {
      one: 'não consegue mais entrar e todas as sessões terminam. Dá para desbloquear depois.',
      many: 'não conseguem mais entrar e todas as sessões terminam. Dá para desbloquear depois.',
    },
    confirmLabel: { one: 'Bloquear', many: 'Bloquear' },
    isDestructive: true,
    toState: { one: 'Bloqueado', many: 'Bloqueados' },
    done: { one: 'bloqueado', many: 'bloqueados' },
  },
  delete: {
    verb: 'Excluir',
    consequence: {
      one: 'perde a conta, os logins sociais e as sessões. Não dá para desfazer.',
      many: 'perdem as contas, os logins sociais e as sessões. Não dá para desfazer.',
    },
    confirmLabel: { one: 'Excluir usuário', many: 'Excluir usuários' },
    isDestructive: true,
    toState: { one: 'Excluído', many: 'Excluídos' },
    done: { one: 'excluído', many: 'excluídos' },
  },
}

export function bulkTitleOf(action: BulkAction, count: number): string {
  return `${BULK_CONFIRMATIONS[action].verb} ${peopleCount(count)}?`
}

/** Names who is reached, so nothing happens to an account the admin did not see. */
export function bulkDescriptionOf(action: BulkAction, subject: BulkSubject): string {
  const { emails } = subject
  const consequence = wordFor(BULK_CONFIRMATIONS[action].consequence, emails.length)

  return `${listOf(emails)} ${consequence}`
}

/** The flash once it worked: "1 usuário bloqueado", "3 usuários bloqueados". */
export function bulkDoneOf(action: BulkAction, count: number): string {
  return `${peopleCount(count)} ${wordFor(BULK_CONFIRMATIONS[action].done, count)}`
}

/** The action's button and confirm label, in the number of people it reaches. */
export function bulkLabelOf(action: BulkAction, count: number): string {
  return wordFor(BULK_CONFIRMATIONS[action].confirmLabel, count)
}

/**
 * The preview of the change, only when every picked user starts from the same state and the
 * action changes that state (a resend leaves it as it was).
 */
export function bulkChangeOf(action: BulkAction, subject: BulkSubject): ConfirmChange | undefined {
  const { emails, sharedState } = subject
  const toState = BULK_CONFIRMATIONS[action].toState

  if (sharedState === null || toState === null) {
    return undefined
  }

  return {
    subject: peopleCount(emails.length),
    icon: Users,
    from: stateName(sharedState, emails.length),
    to: wordFor(toState, emails.length),
  }
}

/** "1 usuário", "3 usuários". */
export function peopleCount(count: number): string {
  if (count === 1) {
    return '1 usuário'
  }

  return `${count.toLocaleString('pt-BR')} usuários`
}

function wordFor(wording: Wording, count: number): string {
  if (count === 1) {
    return wording.one
  }

  return wording.many
}

function stateName(state: AccountState, count: number): string {
  if (count === 1) {
    return ACCOUNT_STATE_LABELS[state]
  }

  return PLURAL_STATES[state]
}

/** "a@x, b@y e c@z", or the first five "e mais 12". */
function listOf(emails: readonly string[]): string {
  const listed = emails.slice(0, LISTED_EMAILS)
  const rest = emails.length - listed.length

  if (rest > 0) {
    return `${listed.join(', ')} e mais ${rest.toLocaleString('pt-BR')}`
  }

  const last = listed.at(-1) ?? ''

  if (listed.length < 2) {
    return last
  }

  return `${listed.slice(0, -1).join(', ')} e ${last}`
}
