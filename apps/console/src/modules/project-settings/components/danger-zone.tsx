import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useDeleteProjectMutation } from '@/modules/projects/queries/use-projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'

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
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Zona de perigo</CardTitle>
        <CardDescription>
          Excluir o projeto apaga os usuários, as chaves e o banco de dados. Só donos podem.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ErrorAlert error={deletion.error} />
        <div>
          <ConfirmButton
            title={`Excluir ${projectName}?`}
            description="Todos os dados do projeto são apagados para sempre."
            confirmLabel="Excluir projeto"
            isDestructive
            isPending={deletion.isPending}
            onConfirm={deleteProject}
          >
            Excluir projeto
          </ConfirmButton>
        </div>
      </CardContent>
    </Card>
  )
}
