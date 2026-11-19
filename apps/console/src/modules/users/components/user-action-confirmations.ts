import User from '~icons/solar/user-linear'

import type { UserAction } from '@/modules/users/queries/use-users'
import type { ConfirmChange } from '@/shared/ui/confirm-change'

/** Actions that need a confirmation before they run. */
export type ConfirmedAction = Extract<UserAction, 'ban' | 'end-sessions' | 'reset-mfa' | 'delete'>

/** Who the action is on, and what the page knows about them. */
export type ConfirmationSubject = {
  email: string
  /** The account's state as the page shows it ("Email não confirmado"); "Ativo" when unknown. */
  state?: string
  /** Sessions that would end; unknown where the page lists none (the users list, activity). */
  sessionCount?: number
}

type Confirmation = {
  title: (subject: ConfirmationSubject) => string
  description: (subject: ConfirmationSubject) => string
  confirmLabel: string
  isDestructive: boolean
  change: (subject: ConfirmationSubject) => ConfirmChange
}

const DEFAULT_STATE = 'Ativo'

export const CONFIRMATIONS: Record<ConfirmedAction, Confirmation> = {
  ban: {
    title: ({ email }) => `Bloquear ${email}?`,
    description: () =>
      'O usuário não consegue mais entrar e todas as sessões terminam. Dá para desbloquear depois.',
    confirmLabel: 'Bloquear',
    isDestructive: true,
    change: (subject) => changeOf(subject, 'Bloqueado'),
  },
  'end-sessions': {
    title: ({ email }) => `Encerrar as sessões de ${email}?`,
    description: ({ sessionCount }) =>
      `${devicesLeaving(sessionCount)} e precisa entrar de novo. A conta continua ativa.`,
    confirmLabel: 'Encerrar sessões',
    isDestructive: false,
    change: ({ email }) => ({ subject: email, icon: User, from: 'Conectado', to: 'Desconectado' }),
  },
  'reset-mfa': {
    title: ({ email }) => `Remover o MFA de ${email}?`,
    description: () => 'Use quando o usuário perdeu o celular e você já confirmou quem ele é.',
    confirmLabel: 'Remover MFA',
    isDestructive: false,
    change: ({ email }) => ({ subject: email, icon: User, from: 'Com MFA', to: 'Sem MFA' }),
  },
  delete: {
    title: ({ email }) => `Excluir ${email}?`,
    description: () => 'Remove o usuário, os logins sociais e as sessões. Não dá para desfazer.',
    confirmLabel: 'Excluir usuário',
    isDestructive: true,
    change: (subject) => changeOf(subject, 'Excluído'),
  },
}

function changeOf(subject: ConfirmationSubject, to: string): ConfirmChange {
  return { subject: subject.email, icon: User, from: subject.state ?? DEFAULT_STATE, to }
}

/** Names the scope when the page knows it, so ending sessions is never a blind "all". */
function devicesLeaving(sessionCount: number | undefined): string {
  if (sessionCount === 1) {
    return 'O usuário sai do único dispositivo conectado'
  }

  if (sessionCount === undefined) {
    return 'O usuário sai de todos os dispositivos'
  }

  return `O usuário sai dos ${sessionCount.toLocaleString('pt-BR')} dispositivos conectados`
}
