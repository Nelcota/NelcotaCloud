import Database from '~icons/solar/database-linear'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import {
  useCurrentProject,
  useDeleteProjectMutation,
} from '@/modules/projects/queries/use-projects'
import { ProjectDeletionIllustration } from '@/modules/project-settings/general/components/project-deletion-illustration'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { SettingsSection } from '@/shared/ui/settings-section'

type DangerZoneProps = {
  projectId: string
  projectName: string
}

export function DangerZone({ projectId, projectName }: DangerZoneProps): JSX.Element | null {
  const navigate = useNavigate()
  const deletion = useDeleteProjectMutation()
  // The slug is what the user types to confirm; the name is the fallback while it loads.
  const project = useCurrentProject(projectId)
  const confirmationText = project?.slug ?? projectName

  async function deleteProject(): Promise<void> {
    await deletion.mutateAsync(projectId)
    await navigate({ to: '/' })
  }

  // Only owners can delete; members would find out only after confirming.
  if (project?.role !== 'owner') {
    return null
  }

  return (
    <SettingsSection title="Zona de perigo" tone="danger">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Excluir este projeto</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Apaga os usuários, as chaves e o banco de dados.
          </p>
        </div>
        <div className="shrink-0">
          <ConfirmButton
            title={`Excluir ${projectName} para sempre?`}
            description="O banco de dados do projeto, seus usuários e suas chaves são apagados e não há como recuperar. Apps que usam este projeto param de funcionar na hora."
            confirmLabel="Excluir projeto"
            change={{ subject: projectName, icon: Database, from: 'Ativo', to: 'Excluído' }}
            illustration={<ProjectDeletionIllustration />}
            confirmationText={confirmationText}
            isDestructive
            isPending={deletion.isPending}
            onConfirm={deleteProject}
          >
            Excluir projeto
          </ConfirmButton>
        </div>
      </div>
    </SettingsSection>
  )
}
