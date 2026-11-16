import Menu from '~icons/solar/hamburger-menu-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { SidebarContent } from '@/app/shell/sidebar-content'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'

/** Below the md breakpoint the sidebar column hides; this sheet carries the same content. */
export function MobileNav(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="hover:bg-accent flex size-10 shrink-0 items-center justify-center rounded-md transition-colors md:hidden"
      >
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar w-72 gap-0 p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SidebarContent onNavigate={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
