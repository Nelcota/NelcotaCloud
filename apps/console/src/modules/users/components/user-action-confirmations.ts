import { User } from 'lucide-react'

import type { UserAction } from '@/modules/users/queries/use-users'
import type { ConfirmChange } from '@/shared/ui/confirm-change'

/** Actions that need a confirmation before they run. */
export type ConfirmedAction = Extract<UserAction, 'ban' | 'end-sessions' | 'reset-mfa' | 'delete'>

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
  'end-sessions': {
    title: (email) => `Encerrar as sessões de ${email}?`,
    description:
      'O usuário sai de todos os dispositivos e precisa entrar de novo. A conta continua ativa.',
    confirmLabel: 'Encerrar sessões',
    isDestructive: false,
    change: (email) => ({ subject: email, icon: User, from: 'Conectado', to: 'Desconectado' }),
  },
  'reset-mfa': {
    title: () => 'Remover o MFA?',
    description: 'O usuário passa a entrar só com a senha até cadastrar um novo autenticador.',
    confirmLabel: 'Remover MFA',
    isDestructive: false,
    change: (email) => ({ subject: email, icon: User, from: 'Com MFA', to: 'Sem MFA' }),
  },
  delete: {
    title: (email) => `Excluir ${email}?`,
    description: 'Remove o usuário, suas identidades e sessões. Não dá para desfazer.',
    confirmLabel: 'Excluir usuário',
    isDestructive: true,
    change: (email) => ({ subject: email, icon: User, from: 'Ativo', to: 'Excluído' }),
  },
}
