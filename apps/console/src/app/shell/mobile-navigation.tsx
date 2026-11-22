import { useLocation } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { type JSX, type MouseEvent, useState } from 'react'

import { consoleSectionOf } from '@/app/shell/console-sections'
import { InvitationsBell } from '@/app/shell/invitations-bell'
import { MobileConsoleLinks } from '@/app/shell/mobile-console-links'
import { ProjectSidebar } from '@/app/shell/project-sidebar'
import type { ProjectLocation } from '@/app/shell/project-sections'
import { ThemeToggle } from '@/app/shell/theme-toggle'
import { Button } from '@/shared/ui/primitives/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/primitives/sheet'

/** Below the large breakpoint the console's places and the project's pages open in a sheet. */
export function MobileNavigation({ location }: { location: ProjectLocation | null }): JSX.Element {
  const { pathname } = useLocation()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const current = consoleSectionOf(pathname, location !== null)

  function changeOpen(isOpen: boolean): void {
    if (isOpen) {
      setOpenPath(pathname)
      return
    }

    setOpenPath(null)
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
        <div className="flex h-full min-h-0 flex-col" onClick={closeOnLink}>
          <MobileConsoleLinks current={current} />
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ProjectPages location={location} />
          </div>
          <div className="flex gap-1 border-t p-2">
            <InvitationsBell />
            <ThemeToggle />
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
