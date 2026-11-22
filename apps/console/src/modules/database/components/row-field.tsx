import type { JSX } from 'react'
import { useId } from 'react'

import {
  type FieldDraft,
  type FieldMode,
  canUseDefault,
  fieldError,
} from '@/modules/database/components/row-draft'
import { RowFieldInput } from '@/modules/database/components/row-field-input'
import type { components } from '@/shared/api/api-schema'
import { FieldMessages } from '@/shared/ui/field-messages'
import { type SegmentOption, SegmentedControl } from '@/shared/ui/segmented-control'

type ColumnOverview = components['schemas']['ColumnOverview']

type RowFieldProps = {
  column: ColumnOverview
  field: FieldDraft
  /** New rows may leave a column to its default; existing rows only change values. */
  isNewRow: boolean
  onChange: (field: FieldDraft) => void
}

/** One column of the row form: its name and type, how it is sent, and its value. */
export function RowField({ column, field, isNewRow, onChange }: RowFieldProps): JSX.Element {
  const id = useId()
  const error = fieldError(column, field)
  const modes = modeOptions(column, isNewRow)

  return (
    <div className="grid min-w-0 gap-1.5" data-invalid={error !== null || undefined}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <label htmlFor={id} className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate font-mono text-sm font-medium">{column.name}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">{column.type}</span>
          <KeyMark column={column} />
        </label>
        <ModePicker
          column={column}
          modes={modes}
          mode={field.mode}
          onModeChange={(mode) => onChange({ ...field, mode })}
        />
      </div>
      <RowFieldInput
        id={id}
        column={column}
        field={field}
        error={error}
        isReadOnly={isNewRow === false && column.is_identity}
        onChange={onChange}
      />
      <FieldMessages id={id} error={error ?? undefined} />
    </div>
  )
}

function KeyMark({ column }: { column: ColumnOverview }): JSX.Element | null {
  if (column.is_primary_key === false) {
    return null
  }

  return <span className="text-xs text-primary">chave primária</span>
}

function modeOptions(column: ColumnOverview, isNewRow: boolean): SegmentOption[] {
  const options: SegmentOption[] = [{ label: 'Valor', value: 'value' }]

  if (column.nullable) {
    options.push({ label: 'NULL', value: 'null' })
  }

  if (isNewRow && canUseDefault(column)) {
    options.push({ label: 'Padrão', value: 'default' })
  }

  return options
}

type ModePickerProps = {
  column: ColumnOverview
  modes: readonly SegmentOption[]
  mode: FieldMode
  onModeChange: (mode: FieldMode) => void
}

function ModePicker({ column, modes, mode, onModeChange }: ModePickerProps): JSX.Element | null {
  if (modes.length < 2) {
    return null
  }

  return (
    <div className="shrink-0">
      <SegmentedControl
        label={`Como enviar ${column.name}`}
        options={modes}
        value={mode}
        isMono
        onValueChange={(value) => onModeChange(toMode(value))}
      />
    </div>
  )
}

function toMode(value: string): FieldMode {
  if (value === 'null' || value === 'default') {
    return value
  }

  return 'value'
}
