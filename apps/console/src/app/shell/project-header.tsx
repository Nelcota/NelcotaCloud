import type { JSX } from 'react'

import { ProjectAvatar } from '@/modules/projects/components/project-avatar'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'

/** The top of the project's sidebar: its tile, its name and its slug. */
export function ProjectHeader({ projectId }: { projectId: string }): JSX.Element {
  const project = useCurrentProject(projectId)
  const name = project?.name ?? 'Projeto'

  return (
    <div className="flex min-h-12 items-center gap-3 pr-10 pl-2 md:pr-2">
      <ProjectAvatar projectId={projectId} mascotId={project?.mascot_id} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base leading-tight font-bold">{name}</span>
        <span className="text-muted-foreground block truncate font-mono text-xs">
          {project?.slug}
        </span>
      </span>
    </div>
  )
}
