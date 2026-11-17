import HistoryBold from '~icons/solar/history-bold'
import History from '~icons/solar/history-linear'
import KeyRoundBold from '~icons/solar/key-bold'
import KeyRound from '~icons/solar/key-linear'
import LayoutGridBold from '~icons/solar/widget-2-bold'
import LayoutGrid from '~icons/solar/widget-2-linear'
import LogInBold from '~icons/solar/login-3-bold'
import LogIn from '~icons/solar/login-3-linear'
import MailBold from '~icons/solar/letter-bold'
import Mail from '~icons/solar/letter-linear'
import SettingsBold from '~icons/solar/settings-bold'
import Settings from '~icons/solar/settings-linear'
import PlugBold from '~icons/solar/plug-circle-bold'
import Plug from '~icons/solar/plug-circle-linear'
import TeamBold from '~icons/solar/users-group-two-rounded-bold'
import Team from '~icons/solar/users-group-two-rounded-linear'
import UsersBold from '~icons/solar/users-group-rounded-bold'
import Users from '~icons/solar/users-group-rounded-linear'
import type { IconComponent } from '@/shared/ui/icon-component'

export type ProjectSection = {
  /** Path below `/projects/$projectId`; empty for the overview. */
  segment: string
  label: string
  icon: IconComponent
  /** Solar's filled variant, shown while the section is the current page. */
  currentIcon: IconComponent
  /** Daily work sits at the top of the sidebar; project settings sit at its foot. */
  group: 'main' | 'footer'
}

/** Every page of a project, in sidebar order: connecting the app comes before running it. */
export const PROJECT_SECTIONS: readonly ProjectSection[] = [
  {
    segment: '',
    label: 'Visão geral',
    icon: LayoutGrid,
    currentIcon: LayoutGridBold,
    group: 'main',
  },
  {
    segment: 'keys',
    label: 'Chaves de API',
    icon: KeyRound,
    currentIcon: KeyRoundBold,
    group: 'main',
  },
  { segment: 'users', label: 'Usuários', icon: Users, currentIcon: UsersBold, group: 'main' },
  {
    segment: 'providers',
    label: 'Login social',
    icon: LogIn,
    currentIcon: LogInBold,
    group: 'main',
  },
  { segment: 'email', label: 'Email', icon: Mail, currentIcon: MailBold, group: 'main' },
  { segment: 'webhooks', label: 'Webhooks', icon: Plug, currentIcon: PlugBold, group: 'main' },
  {
    segment: 'activity',
    label: 'Atividade',
    icon: History,
    currentIcon: HistoryBold,
    group: 'main',
  },
  { segment: 'team', label: 'Equipe', icon: Team, currentIcon: TeamBold, group: 'footer' },
  {
    segment: 'settings',
    label: 'Configurações',
    icon: Settings,
    currentIcon: SettingsBold,
    group: 'footer',
  },
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
