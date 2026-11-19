import Plus from '~icons/solar/add-linear'
import type { JSX } from 'react'
import { type Control, Controller, useFieldArray } from 'react-hook-form'

import {
  type ColumnDraft,
  type ReferenceTarget,
  blankColumnDraft,
} from '@/modules/database/components/column-draft'
import { ColumnDraftFields } from '@/modules/database/components/column-draft-fields'
import { Button } from '@/shared/ui/button'

export type CreateTableFields = { name: string; columns: ColumnDraft[] }

type ColumnsEditorProps = {
  control: Control<CreateTableFields>
  targets: readonly ReferenceTarget[]
}

/** The columns of a new table: edit, add and remove them; a table keeps at least one. */
export function ColumnsEditor({ control, targets }: ColumnsEditorProps): JSX.Element {
  const { fields, append, remove } = useFieldArray({ control, name: 'columns' })

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-medium">Colunas</h3>
      {fields.map((column, index) => (
        <Controller
          key={column.id}
          control={control}
          name={`columns.${index}`}
          render={({ field }) => (
            <ColumnDraftFields
              draft={field.value}
              targets={targets}
              canBePrimaryKey
              onChange={field.onChange}
              onRemove={removal(fields.length, () => remove(index))}
            />
          )}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => append(blankColumnDraft(), { shouldFocus: false })}
      >
        <Plus />
        Adicionar coluna
      </Button>
    </div>
  )
}

/** The last column stays: a table needs one. */
function removal(count: number, remove: () => void): (() => void) | undefined {
  if (count <= 1) {
    return undefined
  }

  return remove
}
