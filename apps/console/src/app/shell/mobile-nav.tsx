import { Link, useLocation } from '@tanstack/react-router'
import { FolderKanban, Menu } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { ApiStatus } from '@/app/shell/api-status'
import { ProjectNav } from '@/app/shell/project-nav'
import { projectLocation } from '@/app/shell/project-sections'
import { ThemeToggle } from '@/app/shell/theme-toggle'
import { LogoMark } from '@/shared/ui/logo-mark'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'

/**
 * Below the md breakpoint the rail and the project column hide; this sheet carries all of
 * them (projects, the project's pages, the theme and the API status) so nothing is lost on phones.
 */
export function MobileNav(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const close = (): void => setIsOpen(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="hover:bg-accent flex size-10 shrink-0 items-center justify-center rounded-md transition-colors md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar flex w-72 flex-col gap-0 p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <LogoMark className="size-8" />
          <span className="font-semibold tracking-tight">NelcotaCloud</span>
        </div>
        <div className="grid flex-1 content-start gap-6 overflow-y-auto px-3 py-4">
          <ProjectsLink onNavigate={close} />
          <CurrentProjectNav onNavigate={close} />
        </div>
        <div className="grid gap-2 border-t px-3 py-3">
          <ThemeToggle withLabel className="min-h-10 px-3" />
          <div className="px-3 py-1">
            <ApiStatus />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ProjectsLink({ onNavigate }: { onNavigate: () => void }): JSX.Element {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      activeOptions={{ exact: true }}
      activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' }}
      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors"
    >
      <FolderKanban className="size-4 shrink-0" strokeWidth={1.75} />
      Todos os projetos
    </Link>
  )
}

function CurrentProjectNav({ onNavigate }: { onNavigate: () => void }): JSX.Element | null {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  if (location === null) {
    return null
  }

  return (
    <ProjectNav
      projectId={location.projectId}
      currentSection={location.section}
      onNavigate={onNavigate}
    />
  )
}
