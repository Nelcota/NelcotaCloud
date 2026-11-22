import { Database, History, KeyRound, Settings, SquareCode, User } from 'lucide-react'

import type { ResourceShortcut } from '@/shared/ui/resource-card'

/** The pages a developer opens most, as the shortcut footer of a project card. */
export function projectShortcuts(projectHref: string): readonly ResourceShortcut[] {
  return [
    { label: 'Usuários', href: `${projectHref}/users`, icon: User },
    { label: 'Banco', href: `${projectHref}/database`, icon: Database },
    { label: 'SQL', href: `${projectHref}/sql`, icon: SquareCode },
    { label: 'Chaves', href: `${projectHref}/keys`, icon: KeyRound },
    { label: 'Atividade', href: `${projectHref}/activity`, icon: History },
    { label: 'Configurações', href: `${projectHref}/settings`, icon: Settings },
  ]
}
