import Globe from '~icons/solar/global-linear'
import LockKeyhole from '~icons/solar/lock-keyhole-minimalistic-linear'

import type { components } from '@/shared/api/api-schema'
import type { IconComponent } from '@/shared/ui/icon-component'

export type ApiKeyKind = components['schemas']['ApiKeyKind']

export type KeyKind = {
  kind: ApiKeyKind
  /** Marks the kind in its group heading and in the create dialog's choice. */
  icon: IconComponent
  /** The group's heading: where the keys live, in plain Portuguese. */
  title: string
  /** One key of this kind, for the create dialog's choice and the revoked list. */
  singular: string
  /** The SDK's own name for the kind, which developers meet in code and docs. */
  term: string
  /** What the keys may do and where they must stay, under the heading and in the dialog. */
  description: string
  /** The create dialog's short line for the choice; the group heading says the rest. */
  choiceText: string
  /** What having none of this kind means for the app. */
  emptyText: string
  /** The name field's example, in the create dialog. */
  namePlaceholder: string
  /** Said under the name field before creating; only a server key needs a warning. */
  createWarning?: string
}

/** Both kinds of key, in the order the page shows them: the app's first, then the server's. */
export const KEY_KINDS: readonly KeyKind[] = [
  {
    kind: 'publishable',
    icon: Globe,
    title: 'Chaves do app',
    singular: 'Chave do app',
    term: 'publishable',
    description: 'Vão no app, web ou mobile. São públicas: podem ficar visíveis no código.',
    choiceText: 'Vai no app, web ou mobile. É pública.',
    emptyText: 'Nenhuma chave do app ativa: o app não consegue fazer login.',
    namePlaceholder: 'App iOS',
  },
  {
    kind: 'secret',
    icon: LockKeyhole,
    title: 'Chaves do servidor',
    singular: 'Chave do servidor',
    term: 'secret',
    description: 'Ficam só no seu servidor. Administram usuários e nunca vão para o app.',
    choiceText: 'Fica no seu servidor. Administra usuários.',
    emptyText: 'Nenhuma chave do servidor ativa: seu servidor não consegue administrar usuários.',
    namePlaceholder: 'API de produção',
    createWarning: 'Ela aparece uma única vez, logo depois de criar: tenha onde guardá-la.',
  },
]

/** Takes any string, since key summaries carry their kind as plain text. */
export function keyKindOf(kind: string): KeyKind | undefined {
  return KEY_KINDS.find((candidate) => candidate.kind === kind)
}
