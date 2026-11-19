import type { JSX } from 'react'

import { ProjectCacheScreen } from '@/modules/cache/components/project-cache-screen'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'

export function CachePage(): JSX.Element {
  const projectId = useProjectId()
  const project = useCurrentProject(projectId)

  return (
    <div className="grid gap-6">
      <PageHeader title="Cache" />
      {project?.role === 'member' && (
        <p className="text-muted-foreground text-sm">
          Apenas donos do projeto podem gerenciar o cache.
        </p>
      )}
      {project?.role !== 'member' && <ProjectCacheScreen key={projectId} projectId={projectId} />}
    </div>
  )
}
