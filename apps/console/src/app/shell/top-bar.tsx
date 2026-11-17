import { useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { consolePageTitle } from '@/app/shell/console-sections'
import { MobileNav } from '@/app/shell/mobile-nav'
import { projectLocation } from '@/app/shell/project-sections'

/** The mobile menu and the page's name; the sidebar holds the rest. */
export function TopBar(): JSX.Element {
  const { pathname } = useLocation()

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1 border-b px-2 backdrop-blur sm:gap-2 sm:px-4">
      <MobileNav />
      {/* Not a heading: the page's own h1 names it, and a second title would come first. */}
      <span className="min-w-0 truncate px-2 text-sm font-medium">{pageTitle(pathname)}</span>
    </header>
  )
}

function pageTitle(pathname: string): string {
  const location = projectLocation(pathname)

  if (location === null) {
    return consolePageTitle(pathname)
  }

  return location.section.label
}
