import TrashBin from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'
import { useId } from 'react'

import {
  type ColumnDraft,
  type ReferenceTarget,
  normalizedDraft,
} from '@/modules/database/components/column-draft'
import { ColumnDraftFlags } from '@/modules/database/components/column-draft-flags'
import { ColumnReferenceFields } from '@/modules/database/components/column-reference-fields'
import {
  COLUMN_TYPES,
  DEFAULT_SUGGESTIONS,
  isColumnType,
} from '@/modules/database/components/column-types'
import { Button } from '@/shared/ui/button'
import { FormField } from '@/shared/ui/form-field'
import { SelectField } from '@/shared/ui/select-field'

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
  const suggestionsId = useId()

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
    <fieldset className="grid gap-3 rounded-xl border p-4">
      <legend className="sr-only">Coluna {draft.name}</legend>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_10rem_1fr_auto]">
        <FormField
          label="Nome"
          required
          spellCheck={false}
          autoComplete="off"
          placeholder="created_at"
          className="font-mono"
          value={draft.name}
          onChange={(event) => change({ name: event.target.value })}
        />
        <SelectField
          label="Tipo"
          className="font-mono"
          value={draft.type}
          onChange={(event) => pickType(event.target.value)}
        >
          {COLUMN_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectField>
        <FormField
          label="Padrão"
          spellCheck={false}
          autoComplete="off"
          placeholder="Nenhum"
          className="font-mono"
          list={suggestionsId}
          disabled={draft.isIdentity}
          value={draft.defaultValue}
          onChange={(event) => change({ defaultValue: event.target.value })}
        />
        <RemoveButton name={draft.name} onRemove={props.onRemove} />
      </div>
      <datalist id={suggestionsId}>
        {DEFAULT_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Remover a coluna ${name}`}
      onClick={onRemove}
    >
      <TrashBin />
    </Button>
  )
}
