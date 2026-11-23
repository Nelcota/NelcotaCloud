import type { JSX, ReactNode } from 'react'

import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { ReadOnlyContext } from '@/shared/auth/write-access'

type ProjectWriteAccessProps = { projectId: string | null; children: ReactNode }

/** Marks a viewer's project pages read-only, so write controls say so before any work. */
export function ProjectWriteAccess({ projectId, children }: ProjectWriteAccessProps): JSX.Element {
  const project = useCurrentProject(projectId ?? '')

  return <ReadOnlyContext value={project?.role === 'viewer'}>{children}</ReadOnlyContext>
}
