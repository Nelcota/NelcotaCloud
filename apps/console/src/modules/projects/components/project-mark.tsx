import type { JSX } from 'react'

import { useProjectLogo } from '@/modules/projects/queries/use-project-logo'
import type { ProjectMarkSource } from '@/modules/projects/components/project-mark-source'
import type { AvatarSize } from '@/shared/ui/avatar'
import { ProjectAvatar } from '@/shared/ui/project-avatar'

type ProjectMarkProps = {
  project: ProjectMarkSource
  size: AvatarSize
}

/** The project's logo when it has one, its mascot or initials otherwise. */
export function ProjectMark({ project, size }: ProjectMarkProps): JSX.Element {
  const logo = useProjectLogo(project.id, project.logoVersion ?? null)

  return (
    <ProjectAvatar name={project.name} mascotId={project.mascotId} logoSrc={logo} size={size} />
  )
}
