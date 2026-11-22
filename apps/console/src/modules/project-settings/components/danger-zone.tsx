import type { JSX } from 'react'

import { DeleteProjectButton } from '@/modules/project-settings/components/delete-project-button'
import { RowLink } from '@/modules/project-settings/components/row-link'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SettingsSection } from '@/shared/ui/settings-section'

type DangerZoneProps = {
  projectId: string
  projectName: string
}

/** Handing the project over, then, isolated at the bottom, deleting it; only owners can do either. */
export function DangerZone({ projectId, projectName }: DangerZoneProps): JSX.Element {
  const project = useCurrentProject(projectId)

  if (project === undefined) {
    return <Skeleton className="h-40 rounded-xl" />
  }

  // Members would find out only after confirming, so they see why the actions are missing.
  if (project.role !== 'owner') {
    return (
      <SettingsSection
        title="Ações do dono"
        description="Só os donos do projeto podem transferi-lo ou excluí-lo."
        isDanger
      />
    )
  }

  return (
    <>
      <SettingsSection
        title="Transferir propriedade"
        description="Passe o projeto para outro membro da equipe. Você continua como membro."
        footer={<RowLink href={`/projects/${projectId}/team`} label="Abrir equipe" />}
      />
      <SettingsSection
        title="Excluir projeto"
        description="Apaga o banco, os usuários e as chaves. Apps que usam o projeto param na hora."
        isDanger
        footer={
          <DeleteProjectButton
            projectId={projectId}
            projectName={projectName}
            slug={project.slug}
          />
        }
      />
    </>
  )
}
