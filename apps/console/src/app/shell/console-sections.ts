import FolderBold from '~icons/solar/folder-with-files-bold'
import Folder from '~icons/solar/folder-with-files-linear'
import UserRoundBold from '~icons/solar/user-circle-bold'
import UserRound from '~icons/solar/user-circle-linear'
import type { IconComponent } from '@/shared/ui/icon-component'

export type ConsoleSection = {
  path: '/' | '/account'
  label: string
  icon: IconComponent
  /** Solar's filled variant, shown while the section is the current page. */
  currentIcon: IconComponent
}

/** The pages outside a project, in sidebar order. */
export const CONSOLE_SECTIONS: readonly ConsoleSection[] = [
  { path: '/', label: 'Projetos', icon: Folder, currentIcon: FolderBold },
  { path: '/account', label: 'Minha conta', icon: UserRound, currentIcon: UserRoundBold },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Projetos',
  '/projects/new': 'Novo projeto',
  '/account': 'Minha conta',
}

/** The sidebar section a console URL belongs to: creating a project sits under Projetos. */
export function consoleSectionOf(pathname: string): ConsoleSection | undefined {
  if (pathname === '/projects/new') {
    return CONSOLE_SECTIONS.find((section) => section.path === '/')
  }

  return CONSOLE_SECTIONS.find((section) => section.path === pathname)
}

/** The name of a console page, shown in the top bar. */
export function consolePageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? ''
}
