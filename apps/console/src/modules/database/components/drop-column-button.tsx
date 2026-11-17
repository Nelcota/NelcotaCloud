import Columns from '~icons/solar/list-linear'
import type { JSX } from 'react'

import { useDropColumnMutation } from '@/modules/database/queries/use-column-mutations'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type DropColumnButtonProps = { projectId: string; table: string; column: string }

export function DropColumnButton({ projectId, table, column }: DropColumnButtonProps): JSX.Element {
  const drop = useDropColumnMutation(projectId)

  return (
    <ConfirmButton
      title={`Excluir a coluna ${column}?`}
      description="Os valores dela em todas as linhas são apagados. Não dá para desfazer."
      confirmLabel="Excluir coluna"
      change={{ subject: `${table}.${column}`, icon: Columns, from: 'Coluna', to: 'Excluída' }}
      isDestructive
      isPending={drop.isPending}
      onConfirm={() => drop.mutateAsync({ table, column })}
    >
      Excluir
    </ConfirmButton>
  )
}
