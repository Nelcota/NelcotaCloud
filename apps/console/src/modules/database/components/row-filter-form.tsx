import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import {
  ROW_FILTER_OPERATORS,
  type RowFilter,
  isRowFilterOperator,
  needsValue,
} from '@/modules/database/components/row-filter'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/primitives/button'
import { SelectField } from '@/shared/ui/select-field'
import { TextField } from '@/shared/ui/text-field'

type ColumnOverview = components['schemas']['ColumnOverview']

type RowFilterFormProps = { columns: readonly ColumnOverview[]; onAdd: (filter: RowFilter) => void }

/** Column, condition and value of one new filter. */
export function RowFilterForm({ columns, onAdd }: RowFilterFormProps): JSX.Element {
  const [filter, setFilter] = useState<RowFilter>({
    column: columns[0]?.name ?? '',
    operator: 'eq',
    value: '',
  })

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (filter.column === '') {
      return
    }

    onAdd(filter)
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <SelectField
        label="Coluna"
        options={columns.map((column) => ({ label: column.name, value: column.name }))}
        value={filter.column}
        onValueChange={(column) => setFilter({ ...filter, column })}
      />
      <SelectField
        label="Condição"
        options={ROW_FILTER_OPERATORS.map((operator) => ({
          label: operator.label,
          value: operator.value,
        }))}
        value={filter.operator}
        onValueChange={(operator) => {
          if (isRowFilterOperator(operator)) {
            setFilter({ ...filter, operator })
          }
        }}
      />
      <ValueField filter={filter} onChange={(value) => setFilter({ ...filter, value })} />
      <Button type="submit" size="sm" className="self-end">
        Aplicar filtro
      </Button>
    </form>
  )
}

type ValueFieldProps = { filter: RowFilter; onChange: (value: string) => void }

function ValueField({ filter, onChange }: ValueFieldProps): JSX.Element | null {
  if (needsValue(filter.operator) === false) {
    return null
  }

  return (
    <TextField
      label="Valor"
      value={filter.value}
      className="font-mono"
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
