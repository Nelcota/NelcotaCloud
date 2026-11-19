import { useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { consolePageTitle } from '@/app/shell/console-sections'
import { MobileNav } from '@/app/shell/mobile-nav'
import { projectLocation } from '@/app/shell/project-sections'
import { useDocumentTitle } from '@/app/shell/use-document-title'
import { usePageTitleOverrideValue } from '@/shared/lib/page-title-override'
import { ProjectAvatar } from '@/modules/projects/components/project-avatar'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'

/** Shows the current project when the desktop sidebar is hidden. */
export function TopBar(): JSX.Element {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)
  const projects = useProjectsQuery().data
  const project = projects?.find((candidate) => candidate.id === location?.projectId)
  const pageTitle = location?.section.label ?? consolePageTitle(pathname)

  const titleOverride = usePageTitleOverrideValue()

  useDocumentTitle(titleOverride ?? pageTitle, project?.name)

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1 border-b px-2 backdrop-blur sm:gap-2 sm:px-4 md:hidden">
      <MobileNav />
      <TopBarIdentity project={project} pageTitle={pageTitle} />
    </header>
  )
}

type TopBarIdentityProps = {
  project: components['schemas']['ProjectSummary'] | undefined
  pageTitle: string
}

function TopBarIdentity({ project, pageTitle }: TopBarIdentityProps): JSX.Element {
  if (project === undefined) {
    return <span className="min-w-0 truncate px-2 text-sm font-medium">{pageTitle}</span>
  }

  return (
    <div className="flex min-w-0 items-center gap-2 px-1">
      <ProjectAvatar projectId={project.id} mascotId={project.mascot_id} />
      <div className="min-w-0">
        <span className="block truncate text-sm leading-tight font-bold">{project.name}</span>
        <span className="text-muted-foreground block truncate font-mono text-xs">
          {project.slug}
        </span>
      </div>
    </div>
  )
}
