import { Plus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  type ColumnDraft,
  haveDistinctNames,
  idColumnDraft,
  isDraftComplete,
  toColumnDefinition,
} from '@/modules/database/components/column-draft'
import { ColumnsEditor } from '@/modules/database/components/columns-editor'
import { OBJECT_NAME_HINT, isObjectName } from '@/modules/database/components/object-name'
import { referenceTargets } from '@/modules/database/components/reference-targets'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { useCreateTableMutation } from '@/modules/database/queries/use-table-mutations'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { TextField } from '@/shared/ui/text-field'

/** Creates a table with its columns, then opens it; it starts with row level security on. */
export function CreateTableDialog({ projectId }: { projectId: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [columns, setColumns] = useState<ColumnDraft[]>([])
  const schema = useSchemaQuery(projectId)
  const creation = useCreateTableMutation(projectId)
  const navigate = useNavigate()

  function open(): void {
    setName('')
    setColumns([idColumnDraft()])
    setIsOpen(true)
  }

  async function create(): Promise<void> {
    const table = name.trim()

    await creation.mutateAsync({ name: table, columns: columns.map(toColumnDefinition) })
    await navigate({ to: '/projects/$projectId/database/$table', params: { projectId, table } })
  }

  return (
    <>
      <Button type="button" onClick={open}>
        <Plus aria-hidden data-icon="inline-start" />
        Nova tabela
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Nova tabela"
        size="xl"
        description="Ela começa com row level security ligado: os apps só alcançam as linhas que uma política liberar."
        confirmLabel="Criar tabela"
        missing={tableMissing(name, columns)}
        onConfirm={create}
      >
        <TextField
          label="Nome da tabela"
          required
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder="posts"
          hint={OBJECT_NAME_HINT}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <ColumnsEditor
          columns={columns}
          targets={referenceTargets(schema.data?.tables ?? [])}
          onChange={setColumns}
        />
      </ConfirmDialog>
    </>
  )
}

function tableMissing(name: string, columns: readonly ColumnDraft[]): string | null {
  if (isObjectName(name) === false) {
    return 'Dê um nome válido à tabela'
  }

  if (columns.every(isDraftComplete) === false) {
    return 'Dê um nome válido a cada coluna'
  }

  if (haveDistinctNames(columns) === false) {
    return 'Cada coluna precisa de um nome diferente'
  }

  return null
}
