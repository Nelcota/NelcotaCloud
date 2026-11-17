import { Link } from '@tanstack/react-router'
import FolderKanban from '~icons/solar/folder-with-files-linear'
import Plus from '~icons/solar/add-linear'
import type { JSX } from 'react'

import { ProjectsBrowser } from '@/modules/projects/components/projects-browser'
import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'
import { EmptyState } from '@/shared/ui/empty-state'

type ProjectSummary = components['schemas']['ProjectSummary']

export function ProjectList({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Nenhum projeto ainda"
        description="Crie o primeiro para ter usuários, chaves de API e login social prontos para o seu app."
        action={
          <Link to="/projects/new" className={buttonVariants()}>
            <Plus />
            Criar o primeiro projeto
          </Link>
        }
      />
    )
  }

  return <ProjectsBrowser projects={projects} />
}
