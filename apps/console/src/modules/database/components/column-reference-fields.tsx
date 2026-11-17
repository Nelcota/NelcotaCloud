import type { JSX } from 'react'

import type { ColumnDraft, ReferenceTarget } from '@/modules/database/components/column-draft'
import { ON_DELETE_OPTIONS, isOnDeleteAction } from '@/modules/database/components/column-types'
import { targetLabel } from '@/modules/database/components/reference-targets'
import { SelectField } from '@/shared/ui/select-field'

const NO_REFERENCE = ''

type ColumnReferenceFieldsProps = {
  draft: ColumnDraft
  targets: readonly ReferenceTarget[]
  onChange: (change: Partial<ColumnDraft>) => void
}

/** An optional foreign key: the column it points to, and what a deletion over there does here. */
export function ColumnReferenceFields(props: ColumnReferenceFieldsProps): JSX.Element | null {
  const { draft, targets, onChange } = props

  if (targets.length === 0) {
    return null
  }

  function pickTarget(value: string): void {
    const target = targets.find((candidate) => targetLabel(candidate) === value)
    onChange({ reference: target ?? null })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label="Referência"
        value={selectedValue(draft.reference)}
        onChange={(event) => pickTarget(event.target.value)}
      >
        <option value={NO_REFERENCE}>Nenhuma</option>
        {targets.map((target) => (
          <option key={targetLabel(target)} value={targetLabel(target)}>
            {targetLabel(target)}
          </option>
        ))}
      </SelectField>
      <OnDeleteField draft={draft} onChange={onChange} />
    </div>
  )
}

function selectedValue(reference: ReferenceTarget | null): string {
  if (reference === null) {
    return NO_REFERENCE
  }

  return targetLabel(reference)
}

type OnDeleteFieldProps = Omit<ColumnReferenceFieldsProps, 'targets'>

function OnDeleteField({ draft, onChange }: OnDeleteFieldProps): JSX.Element | null {
  if (draft.reference === null) {
    return null
  }

  function pick(value: string): void {
    if (isOnDeleteAction(value) === false) {
      return
    }

    onChange({ onDelete: value })
  }

  return (
    <SelectField
      label="Se a linha referenciada for excluída"
      value={draft.onDelete}
      onChange={(event) => pick(event.target.value)}
    >
      {ON_DELETE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </SelectField>
  )
}
