import Crown from '~icons/solar/crown-minimalistic-linear'
import Eye from '~icons/solar/eye-linear'
import Logout from '~icons/solar/logout-2-linear'
import Pen from '~icons/solar/pen-linear'
import Trash from '~icons/solar/trash-bin-trash-linear'
import UserDown from '~icons/solar/user-minus-linear'

import type { MemberAction } from '@/modules/team/components/team-row-actions'
import type { MemberRow } from '@/modules/team/components/team-rows'
import type { IconComponent } from '@/shared/ui/icon-component'

const OWNER_POWERS =
  'convidar e remover pessoas, mudar papéis e excluir o projeto com todos os usuários do app'
const ROLE_NAMES = { owner: 'Dono', member: 'Membro', viewer: 'Leitura' }

type ActionCopy = {
  label: string
  ownLabel?: string
  icon: IconComponent
  title: (name: string) => string
  ownTitle?: string
  description: (name: string) => string
  confirmLabel: string
  isDestructive: boolean
  isWeighty: boolean
  from: (row: MemberRow) => string
  to: string
  done: (name: string) => string
  ownDone?: string
}

export const ACTION_COPY: Record<MemberAction, ActionCopy> = {
  promote: {
    label: 'Tornar dono',
    icon: Crown,
    title: (name) => `Tornar ${name} dono do projeto?`,
    description: () => `Donos podem ${OWNER_POWERS}.`,
    confirmLabel: 'Tornar dono',
    isDestructive: false,
    isWeighty: false,
    from: () => ROLE_NAMES.member,
    to: ROLE_NAMES.owner,
    done: (name) => `${name} agora é dono do projeto.`,
  },
  transfer: {
    label: 'Tornar dono',
    icon: Crown,
    title: (name) => `Transferir o projeto para ${name}?`,
    description: (name) =>
      `${name} passa a ${OWNER_POWERS}. Você vira membro e continua gerenciando o projeto, sem essas permissões. Só um dono pode devolver a propriedade a você.`,
    confirmLabel: 'Transferir o projeto',
    isDestructive: false,
    isWeighty: true,
    from: () => ROLE_NAMES.member,
    to: ROLE_NAMES.owner,
    done: (name) => `O projeto agora é de ${name}. Você é membro.`,
  },
  demote: {
    label: 'Tornar membro',
    ownLabel: 'Deixar de ser dono',
    icon: UserDown,
    title: (name) => `Tornar ${name} membro?`,
    ownTitle: 'Deixar de ser dono deste projeto?',
    description: () => `Continua gerenciando o projeto, mas deixa de ${OWNER_POWERS}.`,
    confirmLabel: 'Tornar membro',
    isDestructive: false,
    isWeighty: true,
    from: () => ROLE_NAMES.owner,
    to: ROLE_NAMES.member,
    done: (name) => `${name} agora é membro.`,
    ownDone: 'Você agora é membro deste projeto.',
  },
  restrict: {
    label: 'Deixar só leitura',
    icon: Eye,
    title: (name) => `Deixar ${name} só com leitura?`,
    description: () =>
      'Continua vendo tudo no console, mas não muda nada: dados, configurações, chaves, webhooks e o Editor SQL ficam bloqueados.',
    confirmLabel: 'Deixar só leitura',
    isDestructive: false,
    isWeighty: false,
    from: () => ROLE_NAMES.member,
    to: ROLE_NAMES.viewer,
    done: (name) => `${name} agora só tem leitura.`,
  },
  'allow-edit': {
    label: 'Permitir edição',
    icon: Pen,
    title: (name) => `Permitir que ${name} edite o projeto?`,
    description: () =>
      'Volta a gerenciar o projeto como membro: dados, configurações, chaves, webhooks e o Editor SQL.',
    confirmLabel: 'Permitir edição',
    isDestructive: false,
    isWeighty: false,
    from: () => ROLE_NAMES.viewer,
    to: ROLE_NAMES.member,
    done: (name) => `${name} agora é membro.`,
  },
  remove: {
    label: 'Remover do projeto',
    icon: Trash,
    title: (name) => `Remover ${name}?`,
    description: () =>
      'Perde o acesso ao console deste projeto na hora. Chaves de API que a pessoa copiou continuam funcionando: revogue-as se ela não deve mais usá-las.',
    confirmLabel: 'Remover',
    isDestructive: true,
    isWeighty: false,
    from: (row) => ROLE_NAMES[row.role],
    to: 'Sem acesso',
    done: (name) => `${name} não tem mais acesso ao projeto.`,
  },
  leave: {
    label: 'Sair do projeto',
    icon: Logout,
    title: () => 'Sair deste projeto?',
    description: () =>
      'Você perde o acesso na hora. Para voltar, um dono precisa convidar você de novo.',
    confirmLabel: 'Sair do projeto',
    isDestructive: true,
    isWeighty: false,
    from: (row) => ROLE_NAMES[row.role],
    to: 'Sem acesso',
    done: () => 'Você saiu do projeto.',
  },
}

export function labelFor(action: MemberAction, isOwnRow: boolean): string {
  const copy = ACTION_COPY[action]

  if (isOwnRow && copy.ownLabel !== undefined) {
    return copy.ownLabel
  }

  return copy.label
}

export function titleFor(action: MemberAction, name: string, isOwnRow: boolean): string {
  const copy = ACTION_COPY[action]

  if (isOwnRow && copy.ownTitle !== undefined) {
    return copy.ownTitle
  }

  return copy.title(name)
}

export function doneFor(action: MemberAction, name: string, isOwnRow: boolean): string {
  const copy = ACTION_COPY[action]

  if (isOwnRow && copy.ownDone !== undefined) {
    return copy.ownDone
  }

  return copy.done(name)
}
