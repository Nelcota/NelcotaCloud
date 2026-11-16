import { Outlet, useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { projectLocation } from '@/app/shell/project-sections'
import { SidebarContent } from '@/app/shell/sidebar-content'
import { TopBar } from '@/app/shell/top-bar'

/**
 * The signed-in console: the sidebar when a project is open, and the page under a top bar.
 * Below md the sidebar moves into the top bar's menu sheet.
 */
export function AppShell(): JSX.Element {
  return (
    <div className="bg-background flex min-h-svh">
      <ProjectColumn />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

/** Outside a project the list of projects is the whole page, so it needs no sidebar. */
function ProjectColumn(): JSX.Element | null {
  const { pathname } = useLocation()

  if (projectLocation(pathname) === null) {
    return null
  }

  return (
    <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh w-60 shrink-0 border-r md:block">
      <SidebarContent />
    </aside>
  )
}
