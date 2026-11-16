import { useLocation } from '@tanstack/react-router'
import { ChevronRight, Menu } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ApiStatus } from '@/app/shell/api-status'
import { ProjectSidebar } from '@/app/shell/project-sidebar'
import { ProjectSwitcher } from '@/app/shell/project-switcher'
import { projectLocation } from '@/app/shell/project-sections'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'

/** Where you are (project and page), the mobile menu, and the account. */
export function TopBar(): JSX.Element {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  return (
    <header className="bg-background/95 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-4">
      <MobileMenu hasProject={location !== null} />
      <Location location={location} />
      <div className="flex-1" />
      <OutsideProjectStatus isInProject={location !== null} />
      <AccountMenu />
    </header>
  )
}

function Location({ location }: { location: ReturnType<typeof projectLocation> }): JSX.Element {
  if (location === null) {
    return <span className="px-2 text-sm font-semibold">Projetos</span>
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <ProjectSwitcher projectId={location.projectId} />
      <ChevronRight
        className="text-muted-foreground hidden size-4 shrink-0 sm:block"
        strokeWidth={1.75}
      />
      <span className="hidden truncate text-sm sm:inline">{location.section.label}</span>
    </div>
  )
}

/** Below the md breakpoint the project sidebar becomes a sheet behind this button. */
function MobileMenu({ hasProject }: { hasProject: boolean }): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false)

  if (hasProject === false) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        aria-label="Abrir menu do projeto"
        className="hover:bg-accent flex size-10 items-center justify-center rounded-md md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar w-72 p-0">
        <SheetTitle className="sr-only">Menu do projeto</SheetTitle>
        <ProjectSidebar onNavigate={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
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
