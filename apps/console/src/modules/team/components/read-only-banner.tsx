import type { JSX } from 'react'

import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { Notice } from '@/shared/ui/notice'

/** Above every page of a project the account may only read: buttons stay, the API refuses. */
export function ReadOnlyBanner({ projectId }: { projectId: string | null }): JSX.Element | null {
  const project = useCurrentProject(projectId ?? '')

  if (projectId === null || project?.role !== 'viewer') {
    return null
  }

  return (
    <Notice tone="info" title="Você tem acesso só de leitura neste projeto.">
      Peça a um dono para permitir edição.
    </Notice>
  )
}
