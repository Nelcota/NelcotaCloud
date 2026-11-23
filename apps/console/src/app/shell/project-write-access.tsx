import { useParams } from '@tanstack/react-router'
import type { JSX, ReactNode } from 'react'

import { ReadOnlyBanner } from '@/modules/team/components/read-only-banner'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { ReadOnlyContext } from '@/shared/auth/write-access'

/**
 * Marks a viewer's project pages read-only, so write controls say so before any work, and says
 * it once above the page. Outside a project nothing changes.
 */
export function ProjectWriteAccess({ children }: { children: ReactNode }): JSX.Element {
  const { projectId } = useParams({ strict: false })
  const project = useCurrentProject(projectId ?? '')
  const isReadOnly = project?.role === 'viewer'

  return (
    <ReadOnlyContext value={isReadOnly}>
      <ReadOnlyBanner isShown={isReadOnly} />
      {children}
    </ReadOnlyContext>
  )
}
