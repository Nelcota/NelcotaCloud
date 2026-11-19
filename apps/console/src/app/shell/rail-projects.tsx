import { Link, useLocation } from '@tanstack/react-router'
import AddBold from '~icons/solar/add-circle-bold'
import Add from '~icons/solar/add-circle-linear'
import type { JSX } from 'react'

import { RailLink } from '@/app/shell/rail-link'
import { ProjectAvatar } from '@/modules/projects/components/project-avatar'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { Tooltip } from '@/shared/ui/tooltip'

type ProjectSummary = components['schemas']['ProjectSummary']

type RailProjectsProps = {
  currentProjectId: string | undefined
  onNavigate?: () => void
}

/** One tile per project, then a way to create another. Scrolls on its own when the list is long. */
export function RailProjects({ currentProjectId, onNavigate }: RailProjectsProps): JSX.Element {
  const { pathname } = useLocation()
  const projects = useProjectsQuery().data ?? []

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto py-1 [scrollbar-width:none]">
      {projects.map((project) => (
        <ProjectTile
          key={project.id}
          project={project}
          isCurrent={project.id === currentProjectId}
          onNavigate={onNavigate}
        />
      ))}
      <RailLink
        to="/projects/new"
        label="Novo projeto"
        icon={Add}
        currentIcon={AddBold}
        isCurrent={pathname === '/projects/new'}
        onNavigate={onNavigate}
      />
    </div>
  )
}

type ProjectTileProps = {
  project: ProjectSummary
  isCurrent: boolean
  onNavigate?: () => void
}

/** The bar on the rail marks the open project independently of its avatar color. */
function ProjectTile({ project, isCurrent, onNavigate }: ProjectTileProps): JSX.Element {
  return (
    <div className="relative flex w-full justify-center">
      <CurrentBar isCurrent={isCurrent} />
      <Tooltip label={project.name}>
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          aria-label={project.name}
          onClick={onNavigate}
          className="hover:ring-foreground/20 hover:ring-offset-shell flex size-10 shrink-0 items-center justify-center rounded-xl hover:ring-2 hover:ring-offset-2 motion-safe:transition-transform motion-safe:active:scale-95"
        >
          <ProjectAvatar projectId={project.id} mascotId={project.mascot_id} className="size-10" />
        </Link>
      </Tooltip>
    </div>
  )
}

function CurrentBar({ isCurrent }: { isCurrent: boolean }): JSX.Element | null {
  if (isCurrent === false) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      className="bg-foreground absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full"
    />
  )
}
