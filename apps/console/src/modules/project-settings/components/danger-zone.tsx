import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useDeleteProjectMutation } from '@/modules/projects/queries/use-projects'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'

export function DangerZone({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}): JSX.Element {
  const navigate = useNavigate()
  const deletion = useDeleteProjectMutation()

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
            title={`Excluir ${projectName}?`}
            description="Todos os dados do projeto são apagados para sempre. Apps que usam este projeto param de funcionar."
            confirmLabel="Excluir projeto"
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
