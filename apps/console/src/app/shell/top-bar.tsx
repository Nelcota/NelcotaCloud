import type { JSX } from 'react'

import { MobileNav } from '@/app/shell/mobile-nav'
import { useDocumentTitle } from '@/app/shell/use-document-title'

/**
 * Phones only: the menu and the page's name. From md the sidebar is visible and the page's h1
 * already names it, so the bar would only repeat it.
 */
export function TopBar(): JSX.Element {
  const pageTitle = useDocumentTitle()

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1 border-b px-2 backdrop-blur sm:gap-2 sm:px-4 md:hidden">
      <MobileNav />
      {/* Not a heading: the page's own h1 names it, and a second title would come first. */}
      <span className="min-w-0 truncate px-2 text-sm font-medium">{pageTitle}</span>
    </header>
  )
}
