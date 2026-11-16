import { Link, useLocation } from '@tanstack/react-router'
import type { JSX, ReactNode } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ApiStatus } from '@/app/shell/api-status'
import { MobileNav } from '@/app/shell/mobile-nav'
import { projectLocation } from '@/app/shell/project-sections'
import { LogoMark } from '@/shared/ui/logo-mark'

/** Where you are (the page; the project is in the sidebar), the mobile menu, and the account. */
export function TopBar(): JSX.Element {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 items-center gap-1 border-b px-2 backdrop-blur sm:gap-2 sm:px-4">
      <ProjectMenu isInProject={location !== null} />
      <Location location={location} />
      <div className="flex-1" />
      <OutsideProject isInProject={location !== null}>
        <div className="hidden px-3 sm:block">
          <ApiStatus />
        </div>
        <AccountMenu placement="top-bar" />
      </OutsideProject>
    </header>
  )
}

function Location({ location }: { location: ReturnType<typeof projectLocation> }): JSX.Element {
  if (location === null) {
    return (
      <Link to="/" className="flex items-center gap-2 rounded-md px-1">
        <LogoMark className="size-7" />
        <span className="text-sm font-semibold tracking-tight">NelcotaCloud</span>
      </Link>
    )
  }

  return <h2 className="min-w-0 truncate px-2 text-sm font-medium">{location.section.label}</h2>
}

/** The sidebar sheet on phones; outside a project there is no sidebar to open. */
function ProjectMenu({ isInProject }: { isInProject: boolean }): JSX.Element | null {
  if (isInProject === false) {
    return null
  }

  return <MobileNav />
}

/** Inside a project the sidebar holds the API status and the account; elsewhere the top bar does. */
function OutsideProject({
  isInProject,
  children,
}: {
  isInProject: boolean
  children: ReactNode
}): JSX.Element | null {
  if (isInProject) {
    return null
  }

  return <>{children}</>
}
