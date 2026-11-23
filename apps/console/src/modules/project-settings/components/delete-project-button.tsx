import { Database } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useDeleteProjectMutation } from '@/modules/projects/queries/use-projects'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type DeleteProjectButtonProps = {
  projectId: string
  projectName: string
  /** What the owner types to confirm. */
  slug: string
}

export function DeleteProjectButton({
  projectId,
  projectName,
  slug,
}: DeleteProjectButtonProps): JSX.Element {
  const navigate = useNavigate()
  const deletion = useDeleteProjectMutation()

  async function deleteProject(): Promise<void> {
    await deletion.mutateAsync(projectId)
    await navigate({ to: '/' })
  }

  return (
    <ConfirmButton
      label="Excluir projeto"
      title={`Excluir ${projectName} para sempre?`}
      description="Apaga o banco, os usuários e as chaves, sem volta. Apps que usam o projeto param na hora."
      confirmLabel="Excluir projeto"
      change={{ subject: projectName, icon: Database, from: 'Ativo', to: 'Excluído' }}
      confirmationText={slug}
      isDestructive
      isSolid
      isPending={deletion.isPending}
      onConfirm={deleteProject}
    />
  )
}
