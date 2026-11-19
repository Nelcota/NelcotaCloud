import Menu from '~icons/solar/hamburger-menu-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { NavRail } from '@/app/shell/nav-rail'
import { SidebarContent } from '@/app/shell/sidebar-content'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'

/** Below the md breakpoint the rail and the sidebar list hide; this sheet carries both. */
export function MobileNav(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  function close(): void {
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="hover:bg-accent flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors md:hidden"
      >
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="left" className="bg-shell w-[22rem] max-w-[90vw] flex-row gap-0 p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <NavRail onNavigate={close} />
        <div className="bg-sidebar min-w-0 flex-1 rounded-l-2xl border-l">
          <SidebarContent onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
