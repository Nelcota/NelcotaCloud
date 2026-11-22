import { useLocation } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { type JSX, type MouseEvent, useState } from 'react'

import { CONSOLE_SECTIONS, consoleSectionOf } from '@/app/shell/console-sections'
import { InvitationsBell } from '@/app/shell/invitations-bell'
import { ProjectSidebar } from '@/app/shell/project-sidebar'
import type { ProjectLocation } from '@/app/shell/project-sections'
import { RailLink } from '@/app/shell/rail-link'
import { ThemeToggle } from '@/app/shell/theme-toggle'
import { Button } from '@/shared/ui/primitives/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/primitives/sheet'

/** Below the large breakpoint the rail and the project's pages open in a sheet. */
export function MobileNavigation({ location }: { location: ProjectLocation | null }): JSX.Element {
  const { pathname } = useLocation()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const current = consoleSectionOf(pathname, location !== null)

  function changeOpen(isOpen: boolean): void {
    setOpenPath(isOpen ? pathname : null)
  }

  function closeOnLink(event: MouseEvent<HTMLDivElement>): void {
    if (event.target instanceof Element && event.target.closest('a[href]') !== null) {
      changeOpen(false)
    }
  }

  return (
    <Sheet open={openPath === pathname} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,18rem)] gap-0 bg-background p-0">
        <SheetTitle className="sr-only">Navegação do console</SheetTitle>
        <SheetDescription className="sr-only">
          Projetos, conta e páginas do projeto.
        </SheetDescription>
        <div className="flex h-full min-h-0" onClick={closeOnLink}>
          <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-e bg-frame py-3">
            {CONSOLE_SECTIONS.map((section) => (
              <RailLink
                key={section.path}
                href={section.path}
                label={section.label}
                icon={section.icon}
                isCurrent={section === current}
              />
            ))}
            <div className="mt-auto flex flex-col items-center gap-1">
              <InvitationsBell />
              <ThemeToggle />
            </div>
          </div>
          <div className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">
            <ProjectPages location={location} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ProjectPages({ location }: { location: ProjectLocation | null }): JSX.Element | null {
  if (location === null) {
    return null
  }

  return <ProjectSidebar location={location} />
}
