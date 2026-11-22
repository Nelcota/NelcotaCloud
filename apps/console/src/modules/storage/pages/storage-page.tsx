import type { JSX } from 'react'

import { ProjectStorage } from '@/modules/storage/components/project-storage'
import { useProjectId } from '@/shared/routing/use-project-id'

export function StoragePage(): JSX.Element {
  const projectId = useProjectId()

  return <ProjectStorage key={projectId} projectId={projectId} />
}
