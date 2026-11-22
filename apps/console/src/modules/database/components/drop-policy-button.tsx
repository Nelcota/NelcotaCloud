import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'
import TrashBin from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'

import { useDropPolicyMutation } from '@/modules/database/queries/use-policy-mutations'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type DropPolicyButtonProps = { projectId: string; table: string; policy: string }

export function DropPolicyButton({ projectId, table, policy }: DropPolicyButtonProps): JSX.Element {
  const drop = useDropPolicyMutation(projectId)

  return (
    <ConfirmButton
      label={`Excluir a política ${policy}`}
      icon={TrashBin}
      isIconOnly
      title={`Excluir a política ${policy}?`}
      description="O que só ela liberava deixa de ser acessível pela API."
      confirmLabel="Excluir política"
      change={{ subject: policy, icon: ShieldKeyhole, from: 'Valendo', to: 'Excluída' }}
      isDestructive
      isPending={drop.isPending}
      onConfirm={() => drop.mutateAsync({ table, policy })}
    />
  )
}
