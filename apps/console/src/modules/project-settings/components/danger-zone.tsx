import type { JSX } from 'react'

import { DeleteProjectButton } from '@/modules/project-settings/components/delete-project-button'
import { RowLink } from '@/modules/project-settings/components/row-link'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import type { components } from '@/shared/api/api-schema'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SettingsSection } from '@/shared/ui/settings-section'

type DangerZoneProps = {
  projectId: string
  projectName: string
  project: components['schemas']['ProjectSummary'] | undefined
}

const TITLE = 'Zona de perigo'

/** Handing the project over and deleting it, in one red panel; only owners can do either. */
export function DangerZone({ projectId, projectName, project }: DangerZoneProps): JSX.Element {
  if (project === undefined) {
    return <Skeleton className="h-36 rounded-xl" />
  }

  // Members would find out only after confirming, so they see why the actions are missing.
  if (project.role !== 'owner') {
    return (
      <SettingsSection
        title={TITLE}
        description="Só os donos do projeto podem transferi-lo ou excluí-lo."
        isDanger
      />
    )
  }

  return (
    <SettingsGroup title={TITLE} isDanger>
      <SettingsRow
        title="Transferir propriedade"
        description="Passe o projeto para outro membro da equipe. Você continua como membro."
      >
        <RowLink href={`/projects/${projectId}/team`} label="Abrir equipe" />
      </SettingsRow>
      <SettingsRow
        title="Excluir projeto"
        description="Apaga o banco, os usuários e as chaves. Apps que usam o projeto param na hora."
      >
        <DeleteProjectButton projectId={projectId} projectName={projectName} slug={project.slug} />
      </SettingsRow>
    </SettingsGroup>
  )
}
