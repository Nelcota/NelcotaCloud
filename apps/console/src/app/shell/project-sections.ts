import {
  Database,
  Database as DatabaseActive,
  Folder,
  Folder as FolderActive,
  History,
  History as HistoryActive,
  KeyRound as Key,
  KeyRound as KeyActive,
  LayoutGrid as Overview,
  LayoutGrid as OverviewActive,
  Link2 as Link,
  Link2 as LinkActive,
  Mail as Letter,
  Mail as LetterActive,
  Settings,
  Settings as SettingsActive,
  SquareCode as Code,
  SquareCode as CodeActive,
  User,
  User as UserActive,
  Users as Team,
  Users as TeamActive,
  Webhook as Webhooks,
  Webhook as WebhooksActive,
} from 'lucide-react'
import type { IconComponent } from '@/shared/ui/icon-component'

export type ProjectGroupId = 'home' | 'auth' | 'data' | 'project'

/** A group of pages in the sidebar; the first one has no name. */
export type ProjectGroup = {
  id: ProjectGroupId
  label: string | null
}

/** One page of a project. */
export type ProjectSection = {
  /** Path below `/projects/$projectId`; empty for the overview. */
  segment: string
  label: string
  group: ProjectGroupId
  icon: IconComponent
  activeIcon: IconComponent
}

/** The sidebar, in order: running the app first, managing the project last. */
export const PROJECT_GROUPS: readonly ProjectGroup[] = [
  { id: 'home', label: null },
  { id: 'auth', label: 'Autenticação' },
  { id: 'data', label: 'Dados' },
  { id: 'project', label: 'Projeto' },
]

export const PROJECT_SECTIONS: readonly ProjectSection[] = [
  { segment: '', label: 'Visão geral', group: 'home', icon: Overview, activeIcon: OverviewActive },
  { segment: 'keys', label: 'Chaves de API', group: 'home', icon: Key, activeIcon: KeyActive },
  {
    segment: 'activity',
    label: 'Atividade',
    group: 'home',
    icon: History,
    activeIcon: HistoryActive,
  },
  { segment: 'users', label: 'Usuários', group: 'auth', icon: User, activeIcon: UserActive },
  {
    segment: 'providers',
    label: 'Login social',
    group: 'auth',
    icon: Link,
    activeIcon: LinkActive,
  },
  { segment: 'email', label: 'Email', group: 'auth', icon: Letter, activeIcon: LetterActive },
  {
    segment: 'database',
    label: 'Banco de dados',
    group: 'data',
    icon: Database,
    activeIcon: DatabaseActive,
  },
  { segment: 'sql', label: 'Editor SQL', group: 'data', icon: Code, activeIcon: CodeActive },
  { segment: 'storage', label: 'Arquivos', group: 'data', icon: Folder, activeIcon: FolderActive },
  {
    segment: 'webhooks',
    label: 'Webhooks',
    group: 'project',
    icon: Webhooks,
    activeIcon: WebhooksActive,
  },
  { segment: 'team', label: 'Equipe', group: 'project', icon: Team, activeIcon: TeamActive },
  {
    segment: 'settings',
    label: 'Configurações',
    group: 'project',
    icon: Settings,
    activeIcon: SettingsActive,
  },
]

const PROJECT_PATH = /^\/projects\/([^/]+)(?:\/([^/]+))?/

export type ProjectLocation = {
  projectId: string
  section: ProjectSection
  group: ProjectGroup
}

/** The project, page and group of a URL, or `null` outside a project. */
export function projectLocation(pathname: string): ProjectLocation | null {
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

  const group = PROJECT_GROUPS.find((candidate) => candidate.id === section.group)

  if (group === undefined) {
    return null
  }

  return { projectId, section, group }
}

/** The pages of one group, in sidebar order. */
export function sectionsOf(groupId: ProjectGroupId): readonly ProjectSection[] {
  return PROJECT_SECTIONS.filter((section) => section.group === groupId)
}

export function sectionTitle(section: ProjectSection): string {
  return section.label
}

export function sectionPath(projectId: string, section: ProjectSection): string {
  if (section.segment === '') {
    return `/projects/${projectId}`
  }

  return `/projects/${projectId}/${section.segment}`
}
