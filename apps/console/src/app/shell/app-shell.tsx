import { Outlet, useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { IconRail } from '@/app/shell/icon-rail'
import { ProjectSidebar } from '@/app/shell/project-sidebar'
import { projectLocation } from '@/app/shell/project-sections'
import { TopBar } from '@/app/shell/top-bar'

/**
 * The signed-in console: icon rail, the project's sidebar when a project is open, and the page
 * under a top bar. On small screens the rail hides and the sidebar moves into a sheet.
 */
export function AppShell(): JSX.Element {
  const { pathname } = useLocation()
  const isInProject = projectLocation(pathname) !== null

  return (
    <div className="bg-background flex min-h-svh">
      <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh w-16 shrink-0 border-r md:block">
        <IconRail />
      </aside>
      <ProjectColumn isVisible={isInProject} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function ProjectColumn({ isVisible }: { isVisible: boolean }): JSX.Element | null {
  if (isVisible === false) {
    return null
  }

  return (
    <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh w-60 shrink-0 border-r md:block">
      <ProjectSidebar />
    </aside>
  )
}
