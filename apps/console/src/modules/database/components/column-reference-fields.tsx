import type { JSX } from 'react'

import type { ColumnDraft, ReferenceTarget } from '@/modules/database/components/column-draft'
import { ON_DELETE_OPTIONS, isOnDeleteAction } from '@/modules/database/components/column-types'
import { targetLabel } from '@/modules/database/components/reference-targets'
import { SelectField } from '@/shared/ui/select-field'

/** Target labels always hold a dot (`table.column`), so this can never collide with one. */
const NO_REFERENCE = 'none'

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

  const options = [
    { value: NO_REFERENCE, label: 'Nenhuma' },
    ...targets.map((target) => ({ value: targetLabel(target), label: targetLabel(target) })),
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label="Referência"
        options={options}
        value={selectedValue(draft.reference)}
        onValueChange={pickTarget}
      />
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
      options={ON_DELETE_OPTIONS}
      value={draft.onDelete}
      onValueChange={pick}
    />
  )
}
