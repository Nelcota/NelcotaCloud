import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useDeleteProjectMutation, useProjectsQuery } from '@/modules/projects/queries/use-projects'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'

type DangerZoneProps = {
  projectId: string
  projectName: string
}

export function DangerZone({ projectId, projectName }: DangerZoneProps): JSX.Element {
  const navigate = useNavigate()
  const deletion = useDeleteProjectMutation()
  const confirmationText = useProjectSlug(projectId) ?? projectName

  function deleteProject(): void {
    deletion.mutate(projectId, { onSuccess: () => navigate({ to: '/' }) })
  }

  return (
    <SettingsSection title="Zona de perigo" tone="danger">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Excluir este projeto</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Apaga os usuários, as chaves e o banco de dados. Só donos podem fazer isso.
          </p>
        </div>
        <div className="shrink-0">
          <ConfirmButton
            title={`Excluir ${projectName} para sempre?`}
            description="O banco de dados do projeto, seus usuários e suas chaves são apagados e não há como recuperar. Apps que usam este projeto param de funcionar na hora."
            confirmLabel="Excluir projeto"
            confirmationText={confirmationText}
            isDestructive
            isPending={deletion.isPending}
            onConfirm={deleteProject}
          >
            Excluir projeto
          </ConfirmButton>
        </div>
      </div>
      <ErrorAlert error={deletion.error} />
    </SettingsSection>
  )
}

/** The slug is what the user types to confirm; the name is the fallback while it loads. */
function useProjectSlug(projectId: string): string | undefined {
  const projects = useProjectsQuery()

  return projects.data?.find((project) => project.id === projectId)?.slug
}
