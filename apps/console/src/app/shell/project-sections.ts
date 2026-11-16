import type { LucideIcon } from 'lucide-react'
import { KeyRound, LayoutGrid, LogIn, Mail, Settings, Users } from 'lucide-react'

export type ProjectSection = {
  /** Path below `/projects/$projectId`; empty for the overview. */
  segment: string
  label: string
  icon: LucideIcon
}

/** Every page of a project, in sidebar order. */
export const PROJECT_SECTIONS: readonly ProjectSection[] = [
  { segment: '', label: 'Visão geral', icon: LayoutGrid },
  { segment: 'users', label: 'Usuários', icon: Users },
  { segment: 'keys', label: 'Chaves de API', icon: KeyRound },
  { segment: 'providers', label: 'Login social', icon: LogIn },
  { segment: 'email', label: 'Email', icon: Mail },
  { segment: 'settings', label: 'Configurações', icon: Settings },
]

const PROJECT_PATH = /^\/projects\/([^/]+)(?:\/([^/]+))?/

/** The project and section of a URL, or `null` outside a project. */
export function projectLocation(
  pathname: string,
): { projectId: string; section: ProjectSection } | null {
  const match = PROJECT_PATH.exec(pathname)
  const projectId = match?.[1]

  if (projectId === undefined || projectId === 'new') {
    return null
  }

  const segment = match?.[2] ?? ''
  const section = PROJECT_SECTIONS.find((candidate) => candidate.segment === segment)

  if (section === undefined) {
    return null
  }

  return { projectId, section }
}

export function sectionPath(projectId: string, section: ProjectSection): string {
  if (section.segment === '') {
    return `/projects/${projectId}`
  }

  return `/projects/${projectId}/${section.segment}`
}
