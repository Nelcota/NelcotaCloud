import type { JSX } from 'react'

import { DeleteProjectButton } from '@/modules/project-settings/components/delete-project-button'
import { RowLink } from '@/modules/project-settings/components/row-link'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type DangerZoneProps = {
  projectId: string
  projectName: string
}

/** Handing the project over and deleting it; only owners can do either. */
export function DangerZone({ projectId, projectName }: DangerZoneProps): JSX.Element {
  const project = useCurrentProject(projectId)

  if (project === undefined) {
    return <Skeleton className="h-40 rounded-xl" />
  }

  // Members would find out only after confirming, so they see why the actions are missing.
  if (project.role !== 'owner') {
    return (
      <SettingsGroup title="Ações do dono" isDanger>
        <p className="px-6 py-5 text-sm text-muted-foreground">
          Só os donos do projeto podem transferi-lo ou excluí-lo.
        </p>
      </SettingsGroup>
    )
  }

  return (
    <SettingsGroup title="Ações do dono" isDanger>
      <SettingsRow title="Transferir propriedade" description="Você continua como membro.">
        <RowLink href={`/projects/${projectId}/team`} label="Abrir equipe" />
      </SettingsRow>
      <SettingsRow title="Excluir projeto" description="Apaga usuários, chaves e banco.">
        <DeleteProjectButton projectId={projectId} projectName={projectName} slug={project.slug} />
      </SettingsRow>
    </SettingsGroup>
  )
}
