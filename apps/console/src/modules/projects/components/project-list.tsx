import { Server } from 'lucide-react'
import type { JSX } from 'react'

import { NewProjectButton } from '@/modules/projects/components/new-project-button'
import { ProjectsBrowser } from '@/modules/projects/components/projects-browser'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'

type ProjectSummary = components['schemas']['ProjectSummary']

/** The projects, or a first-run state that starts the first one. */
export function ProjectList({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  if (projects.length === 0) {
    return (
      <EmptyState
        isFramed
        icon={<Server aria-hidden />}
        title="Crie seu primeiro projeto"
        description="Auth, banco Postgres com API REST e chaves de API, prontos em um minuto."
        actions={<NewProjectButton />}
      />
    )
  }

  return <ProjectsBrowser projects={projects} />
}
