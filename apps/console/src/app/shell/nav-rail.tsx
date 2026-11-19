import { useLocation } from '@tanstack/react-router'
import FolderBold from '~icons/solar/folder-with-files-bold'
import Folder from '~icons/solar/folder-with-files-linear'
import type { JSX } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ApiStatusDot } from '@/app/shell/api-status-dot'
import { projectLocation } from '@/app/shell/project-sections'
import { RailLink } from '@/app/shell/rail-link'
import { RailProjects } from '@/app/shell/rail-projects'
import { LogoMark } from '@/shared/ui/logo-mark'
import { TooltipProvider } from '@/shared/ui/tooltip'

/** The icon rail on the shell: the brand, every project to jump between, and the account. */
export function NavRail({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const { pathname } = useLocation()
  const projectId = projectLocation(pathname)?.projectId

  return (
    <TooltipProvider>
      <nav aria-label="Console" className="flex h-full w-16 shrink-0 flex-col items-center py-2">
        <span className="relative mb-3">
          <LogoMark className="size-9 rounded-xl" />
          <ApiStatusDot />
        </span>
        <RailLink
          to="/"
          label="Projetos"
          icon={Folder}
          currentIcon={FolderBold}
          isCurrent={pathname === '/'}
          onNavigate={onNavigate}
        />
        <hr className="border-foreground/10 my-2 w-6" />
        <RailProjects currentProjectId={projectId} onNavigate={onNavigate} />
        <AccountMenu />
      </nav>
    </TooltipProvider>
  )
}
