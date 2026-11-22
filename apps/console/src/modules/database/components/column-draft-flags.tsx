import type { JSX } from 'react'

import { type ColumnDraft, canBeIdentity } from '@/modules/database/components/column-draft'
import { CheckboxField } from '@/shared/ui/switch-field'

type ColumnDraftFlagsProps = {
  draft: ColumnDraft
  /** Columns added to an existing table cannot join its primary key. */
  canBePrimaryKey: boolean
  onChange: (change: Partial<ColumnDraft>) => void
}

const FLAG = 'w-auto'

/** The yes-or-no traits of a column; the ones that do not apply are left out or locked. */
export function ColumnDraftFlags({
  draft,
  canBePrimaryKey,
  onChange,
}: ColumnDraftFlagsProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
      <CheckboxField
        className={FLAG}
        label="Lista ([])"
        checked={draft.isArray}
        onCheckedChange={(isArray) => onChange({ isArray })}
      />
      <CheckboxField
        className={FLAG}
        label="Aceita nulo"
        checked={draft.isNullable}
        disabled={draft.isPrimaryKey || draft.isIdentity}
        onCheckedChange={(isNullable) => onChange({ isNullable })}
      />
      <PrimaryKeyFlag draft={draft} canBePrimaryKey={canBePrimaryKey} onChange={onChange} />
      <CheckboxField
        className={FLAG}
        label="Numeração automática"
        checked={draft.isIdentity}
        disabled={canBeIdentity(draft) === false}
        onCheckedChange={(isIdentity) => onChange({ isIdentity })}
      />
      <CheckboxField
        className={FLAG}
        label="Único"
        checked={draft.isUnique}
        onCheckedChange={(isUnique) => onChange({ isUnique })}
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
    <CheckboxField
      className={FLAG}
      label="Chave primária"
      checked={draft.isPrimaryKey}
      onCheckedChange={(isPrimaryKey) => onChange({ isPrimaryKey })}
    />
  )
}
