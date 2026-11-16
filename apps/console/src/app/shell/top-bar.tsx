import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { JSX } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ApiStatus } from '@/app/shell/api-status'
import { MobileNav } from '@/app/shell/mobile-nav'
import { ProjectSwitcher } from '@/app/shell/project-switcher'
import { projectLocation } from '@/app/shell/project-sections'
import { LogoMark } from '@/shared/ui/logo-mark'

/** Where you are (project and page), the mobile menu, and the account. */
export function TopBar(): JSX.Element {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 items-center gap-1 border-b px-2 backdrop-blur sm:gap-2 sm:px-4">
      <MobileNav />
      <Location location={location} />
      <div className="flex-1" />
      <OutsideProjectStatus isInProject={location !== null} />
      <AccountMenu />
    </header>
  )
}

function Location({ location }: { location: ReturnType<typeof projectLocation> }): JSX.Element {
  if (location === null) {
    return (
      <Link to="/" className="flex items-center gap-2 rounded-md px-1 md:hidden">
        <LogoMark className="size-7" />
        <span className="text-sm font-semibold tracking-tight">NelcotaCloud</span>
      </Link>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <ProjectSwitcher projectId={location.projectId} />
      <ChevronRight
        className="text-muted-foreground hidden size-4 shrink-0 sm:block"
        strokeWidth={1.75}
      />
      <span className="text-muted-foreground hidden truncate text-sm sm:inline">
        {location.section.label}
      </span>
    </div>
  )
}

/** Inside a project the sidebar shows the API status; elsewhere the top bar does. */
function OutsideProjectStatus({ isInProject }: { isInProject: boolean }): JSX.Element | null {
  if (isInProject) {
    return null
  }

  return (
    <div className="hidden px-3 sm:block">
      <ApiStatus />
    </div>
  )
}
