import User from '~icons/solar/user-linear'

import type { UserAction } from '@/modules/users/queries/use-users'
import type { ConfirmChange } from '@/shared/ui/confirm-change'

/** Actions that need a confirmation before they run. */
export type ConfirmedAction = Extract<UserAction, 'ban' | 'reset-mfa' | 'delete'>

type Confirmation = {
  title: (email: string) => string
  description: string
  confirmLabel: string
  isDestructive: boolean
  change: (email: string) => ConfirmChange
}

export const CONFIRMATIONS: Record<ConfirmedAction, Confirmation> = {
  ban: {
    title: (email) => `Bloquear ${email}?`,
    description: 'O usuário não consegue mais entrar e todas as sessões terminam.',
    confirmLabel: 'Bloquear',
    isDestructive: true,
    change: (email) => ({ subject: email, icon: User, from: 'Ativo', to: 'Bloqueado' }),
  },
  'reset-mfa': {
    title: () => 'Remover o autenticador?',
    description: 'Use quando o usuário perdeu o celular e você já confirmou quem ele é.',
    confirmLabel: 'Remover MFA',
    isDestructive: false,
    change: (email) => ({ subject: email, icon: User, from: 'Com MFA', to: 'Sem MFA' }),
  },
  delete: {
    title: (email) => `Excluir ${email}?`,
    description: 'Remove o usuário, suas identidades e sessões. Não dá para desfazer.',
    confirmLabel: 'Excluir',
    isDestructive: true,
    change: (email) => ({ subject: email, icon: User, from: 'Ativo', to: 'Excluído' }),
  },
}
