import { CircleUser as UserRound, LayoutGrid as Folder } from 'lucide-react'
import type { IconComponent } from '@/shared/ui/icon-component'

export type ConsoleSection = {
  path: '/' | '/account'
  label: string
  icon: IconComponent
}

/** The places outside a project, in rail order. */
export const CONSOLE_SECTIONS: readonly ConsoleSection[] = [
  { path: '/', label: 'Projetos', icon: Folder },
  { path: '/account', label: 'Minha conta', icon: UserRound },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Projetos',
  '/projects/new': 'Novo projeto',
  '/account': 'Minha conta',
}

/** The rail place a URL belongs to: creating a project and every project page sit under Projetos. */
export function consoleSectionOf(
  pathname: string,
  isInsideProject: boolean,
): ConsoleSection | undefined {
  if (pathname === '/projects/new' || isInsideProject) {
    return CONSOLE_SECTIONS.find((section) => section.path === '/')
  }

  return CONSOLE_SECTIONS.find((section) => section.path === pathname)
}

/** The name of a console page, shown in the top bar. */
export function consolePageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? ''
}
