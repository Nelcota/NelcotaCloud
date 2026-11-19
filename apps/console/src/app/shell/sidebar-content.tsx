import { useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ConsoleSidebar } from '@/app/shell/console-sidebar'
import { MfaReminderCard } from '@/app/shell/mfa-reminder-card'
import { ProjectHeader } from '@/app/shell/project-header'
import { ProjectNav } from '@/app/shell/project-nav'
import { PROJECT_GROUPS, projectLocation } from '@/app/shell/project-sections'
import { SidebarGroup } from '@/app/shell/sidebar-group'

/**
 * The sidebar list beside the page: the open project's name and its pages in groups, with a
 * security reminder at the foot. Outside a project the console's own list takes its place.
 * The desktop column and the mobile sheet render the same content.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  if (location === null) {
    return <ConsoleSidebar pathname={pathname} onNavigate={onNavigate} />
  }

  return (
    <nav aria-label="Projeto" className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <ProjectHeader projectId={location.projectId} />
      {PROJECT_GROUPS.map(({ group, label }) => (
        <SidebarGroup key={group} label={label}>
          <ProjectNav
            projectId={location.projectId}
            currentSection={location.section}
            group={group}
            onNavigate={onNavigate}
          />
        </SidebarGroup>
      ))}
      <div className="flex-1" />
      <MfaReminderCard onNavigate={onNavigate} />
    </nav>
  )
}
