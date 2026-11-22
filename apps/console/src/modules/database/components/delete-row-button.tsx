import { Trash2 as Trash } from 'lucide-react'
import type { JSX } from 'react'

import type { RowTarget } from '@/modules/database/components/row-editor-sheet'
import type { RowFilter } from '@/modules/database/components/row-filter'
import { useDeleteRowMutation } from '@/modules/database/queries/use-row-mutations'
import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type TableOverview = components['schemas']['TableOverview']

type DeleteRowButtonProps = {
  projectId: string
  table: TableOverview
  target: RowTarget
  onDeleted: () => void
}

/** Deletes the open row after a confirmation; nothing for a row not inserted yet. */
export function DeleteRowButton({
  projectId,
  table,
  target,
  onDeleted,
}: DeleteRowButtonProps): JSX.Element | null {
  const deletion = useDeleteRowMutation(projectId)

  if (target.kind === 'new') {
    return null
  }

  async function remove(key: RowFilter[]): Promise<void> {
    await deletion.mutateAsync({ table: table.name, key })
    onDeleted()
  }

  return (
    <ConfirmButton
      label="Excluir linha"
      icon={Trash}
      isIconOnly
      isDestructive
      title={`Excluir a linha ${target.number.toLocaleString('pt-BR')}?`}
      description={`Ela sai de ${table.name} para sempre. Linhas que apontam para ela podem impedir a exclusão.`}
      confirmLabel="Excluir linha"
      onConfirm={() => remove(target.key)}
    />
  )
}
