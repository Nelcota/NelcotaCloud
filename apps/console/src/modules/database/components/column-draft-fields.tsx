import { Trash2 as TrashBin } from 'lucide-react'
import type { JSX } from 'react'

import {
  type ColumnDraft,
  type ReferenceTarget,
  normalizedDraft,
} from '@/modules/database/components/column-draft'
import { ColumnDefaultField } from '@/modules/database/components/column-default-field'
import { ColumnDraftFlags } from '@/modules/database/components/column-draft-flags'
import { ColumnReferenceFields } from '@/modules/database/components/column-reference-fields'
import { COLUMN_TYPES, isColumnType } from '@/modules/database/components/column-types'
import { Button } from '@/shared/ui/primitives/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'
import { SelectField } from '@/shared/ui/select-field'
import { TextField } from '@/shared/ui/text-field'

const TYPE_OPTIONS = COLUMN_TYPES.map((value) => ({ label: value, value }))

export type ColumnDraftFieldsProps = {
  draft: ColumnDraft
  targets: readonly ReferenceTarget[]
  canBePrimaryKey: boolean
  onChange: (draft: ColumnDraft) => void
  /** Absent when the column cannot be removed (the only one of a new table). */
  onRemove?: () => void
}

/** Every field of one column: name, type, default, traits and an optional reference. */
export function ColumnDraftFields(props: ColumnDraftFieldsProps): JSX.Element {
  const { draft } = props

  function change(update: Partial<ColumnDraft>): void {
    props.onChange(normalizedDraft({ ...draft, ...update }))
  }

  function pickType(value: string): void {
    if (isColumnType(value) === false) {
      return
    }

    change({ type: value })
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl bg-surface p-3">
      <legend className="sr-only">Coluna {draft.name}</legend>
      <div className="flex items-end gap-2">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
          <TextField
            label="Nome"
            required
            spellCheck={false}
            autoComplete="off"
            placeholder="created_at"
            value={draft.name}
            onChange={(event) => change({ name: event.target.value })}
          />
          <SelectField
            label="Tipo"
            options={TYPE_OPTIONS}
            value={draft.type}
            onValueChange={pickType}
          />
          <ColumnDefaultField draft={draft} onChange={change} />
        </div>
        <RemoveButton name={draft.name} onRemove={props.onRemove} />
      </div>
      <ColumnDraftFlags draft={draft} canBePrimaryKey={props.canBePrimaryKey} onChange={change} />
      <ColumnReferenceFields draft={draft} targets={props.targets} onChange={change} />
    </fieldset>
  )
}

type RemoveButtonProps = { name: string; onRemove?: () => void }

function RemoveButton({ name, onRemove }: RemoveButtonProps): JSX.Element | null {
  if (onRemove === undefined) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover a coluna ${name}`}
          onClick={onRemove}
        >
          <TrashBin aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Remover coluna</TooltipContent>
    </Tooltip>
  )
}
