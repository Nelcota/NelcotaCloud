import type { JSX } from 'react'

import {
  type FieldDraft,
  isBooleanColumn,
  isJsonColumn,
} from '@/modules/database/components/row-draft'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { describedBy } from '@/shared/ui/field-ids'
import { Input } from '@/shared/ui/primitives/input'
import { Textarea } from '@/shared/ui/primitives/textarea'
import { SegmentedControl } from '@/shared/ui/segmented-control'

type ColumnOverview = components['schemas']['ColumnOverview']

type RowFieldInputProps = {
  id: string
  column: ColumnOverview
  field: FieldDraft
  error: string | null
  /** Identity columns keep the value Postgres generated. */
  isReadOnly: boolean
  onChange: (field: FieldDraft) => void
}

/** The value of one column: an input fitting its type, or what Postgres will put there. */
export function RowFieldInput(props: RowFieldInputProps): JSX.Element {
  const { id, column, field, error, onChange } = props

  if (field.mode === 'null') {
    return <Placeholder id={id} text="NULL" />
  }

  if (field.mode === 'default') {
    return <Placeholder id={id} text={defaultText(column)} />
  }

  const describedById = describedBy(id, undefined, error ?? undefined)
  const change = (text: string): void => onChange({ ...field, text })

  if (isBooleanColumn(column)) {
    return <BooleanPicker column={column} text={field.text} onChange={change} />
  }

  if (isJsonColumn(column) || field.text.includes('\n')) {
    return (
      <Textarea
        id={id}
        value={field.text}
        rows={4}
        spellCheck={false}
        className="font-mono sm:text-xs"
        aria-invalid={error !== null || undefined}
        aria-describedby={describedById}
        onChange={(event) => change(event.target.value)}
      />
    )
  }

  return (
    <Input
      id={id}
      value={field.text}
      readOnly={props.isReadOnly}
      className={cn('font-mono sm:text-xs', props.isReadOnly && 'text-muted-foreground')}
      aria-invalid={error !== null || undefined}
      aria-describedby={describedById}
      onChange={(event) => change(event.target.value)}
    />
  )
}

function defaultText(column: ColumnOverview): string {
  if (column.default !== null && column.default !== undefined) {
    return `Padrão: ${column.default}`
  }

  if (column.is_identity) {
    return 'Gerado pelo banco'
  }

  return 'NULL'
}

function Placeholder({ id, text }: { id: string; text: string }): JSX.Element {
  return (
    <output
      id={id}
      className="flex h-8 items-center truncate rounded-lg bg-surface px-3 font-mono text-xs text-muted-foreground"
    >
      {text}
    </output>
  )
}

type BooleanPickerProps = { column: ColumnOverview; text: string; onChange: (text: string) => void }

function BooleanPicker({ column, text, onChange }: BooleanPickerProps): JSX.Element {
  return (
    <SegmentedControl
      label={`Valor de ${column.name}`}
      options={[
        { label: 'true', value: 'true' },
        { label: 'false', value: 'false' },
      ]}
      value={text}
      isMono
      onValueChange={onChange}
    />
  )
}
