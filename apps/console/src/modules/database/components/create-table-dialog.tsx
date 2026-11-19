import Plus from '~icons/solar/add-linear'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
  type ColumnDraft,
  haveDistinctNames,
  idColumnDraft,
  isDraftComplete,
  toColumnDefinition,
} from '@/modules/database/components/column-draft'
import { ColumnsEditor, type CreateTableFields } from '@/modules/database/components/columns-editor'
import { OBJECT_NAME_HINT, isObjectName } from '@/modules/database/components/object-name'
import { referenceTargets } from '@/modules/database/components/reference-targets'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { useCreateTableMutation } from '@/modules/database/queries/use-table-mutations'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { FormField } from '@/shared/ui/form-field'

/** Creates a table with its columns, then opens it; it starts with row level security on. */
export function CreateTableDialog({ projectId }: { projectId: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<CreateTableFields>({ defaultValues: { name: '', columns: [] } })
  const name = useWatch({ control: form.control, name: 'name' })
  const columns = useWatch({ control: form.control, name: 'columns' })
  const schema = useSchemaQuery(projectId)
  const creation = useCreateTableMutation(projectId)
  const navigate = useNavigate()

  function open(): void {
    form.reset({ name: '', columns: [idColumnDraft()] })
    setIsOpen(true)
  }

  async function create(): Promise<void> {
    const draft = form.getValues()
    const table = draft.name.trim()

    await creation.mutateAsync({ name: table, columns: draft.columns.map(toColumnDefinition) })
    await navigate({ to: '/projects/$projectId/database/$table', params: { projectId, table } })
  }

  return (
    <>
      <Button onClick={open}>
        <Plus />
        Nova tabela
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Nova tabela"
        description="Ela começa com row level security ligado: os apps só alcançam as linhas que uma política liberar."
        confirmLabel="Criar tabela"
        canConfirm={isReady(name, columns)}
        onConfirm={create}
      >
        <FormField
          label="Nome da tabela"
          required
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder="posts"
          hint={OBJECT_NAME_HINT}
          className="font-mono"
          {...form.register('name')}
        />
        <ColumnsEditor
          control={form.control}
          targets={referenceTargets(schema.data?.tables ?? [])}
        />
      </ConfirmDialog>
    </>
  )
}

function isReady(name: string, columns: readonly ColumnDraft[]): boolean {
  if (isObjectName(name) === false || columns.length === 0) {
    return false
  }

  return columns.every(isDraftComplete) && haveDistinctNames(columns)
}
