import type { JSX } from 'react'

import { InlineCheckbox } from '@/modules/database/components/inline-checkbox'
import { type ColumnDraft, canBeIdentity } from '@/modules/database/components/column-draft'

type ColumnDraftFlagsProps = {
  draft: ColumnDraft
  /** Columns added to an existing table cannot join its primary key. */
  canBePrimaryKey: boolean
  onChange: (change: Partial<ColumnDraft>) => void
}

/** The yes-or-no traits of a column; the ones that do not apply are left out or locked. */
export function ColumnDraftFlags({
  draft,
  canBePrimaryKey,
  onChange,
}: ColumnDraftFlagsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      <InlineCheckbox
        label="Lista ([])"
        isChecked={draft.isArray}
        onChange={(isArray) => onChange({ isArray })}
      />
      <InlineCheckbox
        label="Aceita nulo"
        isChecked={draft.isNullable}
        isDisabled={draft.isPrimaryKey || draft.isIdentity}
        onChange={(isNullable) => onChange({ isNullable })}
      />
      <PrimaryKeyFlag draft={draft} canBePrimaryKey={canBePrimaryKey} onChange={onChange} />
      <InlineCheckbox
        label="Numeração automática"
        isChecked={draft.isIdentity}
        isDisabled={canBeIdentity(draft) === false}
        onChange={(isIdentity) => onChange({ isIdentity })}
      />
      <InlineCheckbox
        label="Único"
        isChecked={draft.isUnique}
        onChange={(isUnique) => onChange({ isUnique })}
      />
    </div>
  )
}

function PrimaryKeyFlag({
  draft,
  canBePrimaryKey,
  onChange,
}: ColumnDraftFlagsProps): JSX.Element | null {
  if (canBePrimaryKey === false) {
    return null
  }

  return (
    <InlineCheckbox
      label="Chave primária"
      isChecked={draft.isPrimaryKey}
      onChange={(isPrimaryKey) => onChange({ isPrimaryKey })}
    />
  )
}
