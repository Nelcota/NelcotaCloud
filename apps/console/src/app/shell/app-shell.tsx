import { Outlet, useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ApiStatus } from '@/app/shell/api-status'
import { IconRail } from '@/app/shell/icon-rail'
import { ProjectNav } from '@/app/shell/project-nav'
import { projectLocation } from '@/app/shell/project-sections'
import { TopBar } from '@/app/shell/top-bar'

/**
 * The signed-in console: icon rail, the project's pages when a project is open, and the page
 * under a top bar. Below md the rail and the project column move into the top bar's menu sheet.
 */
export function AppShell(): JSX.Element {
  return (
    <div className="bg-background flex min-h-svh">
      <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh w-16 shrink-0 border-r md:block">
        <IconRail />
      </aside>
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

function ProjectColumn(): JSX.Element | null {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  if (location === null) {
    return null
  }

  return (
    <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <ProjectNav projectId={location.projectId} currentSection={location.section} />
      </div>
      <div className="border-sidebar-border border-t px-6 py-4">
        <ApiStatus />
      </div>
    </aside>
  )
}
