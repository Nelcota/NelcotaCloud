import Plus from '~icons/solar/add-linear'
import type { JSX } from 'react'

import {
  type ColumnDraft,
  type ReferenceTarget,
  blankColumnDraft,
} from '@/modules/database/components/column-draft'
import { ColumnDraftFields } from '@/modules/database/components/column-draft-fields'
import { Button } from '@/shared/ui/button'

type ColumnsEditorProps = {
  columns: readonly ColumnDraft[]
  targets: readonly ReferenceTarget[]
  onChange: (columns: ColumnDraft[]) => void
}

/** The columns of a new table: edit, add and remove them; a table keeps at least one. */
export function ColumnsEditor({ columns, targets, onChange }: ColumnsEditorProps): JSX.Element {
  function replace(updated: ColumnDraft): void {
    onChange(columns.map((column) => pickUpdated(column, updated)))
  }

  function remove(key: number): void {
    onChange(columns.filter((column) => column.key !== key))
  }

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-medium">Colunas</h3>
      {columns.map((column) => (
        <ColumnDraftFields
          key={column.key}
          draft={column}
          targets={targets}
          canBePrimaryKey
          onChange={replace}
          onRemove={removal(columns.length, () => remove(column.key))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => onChange([...columns, blankColumnDraft()])}
      >
        <Plus />
        Adicionar coluna
      </Button>
    </div>
  )
}

function pickUpdated(column: ColumnDraft, updated: ColumnDraft): ColumnDraft {
  if (column.key === updated.key) {
    return updated
  }

  return column
}

/** The last column stays: a table needs one. */
function removal(count: number, remove: () => void): (() => void) | undefined {
  if (count <= 1) {
    return undefined
  }

  return remove
}
