import { ListFilter, X } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  MAX_ROW_FILTERS,
  type RowFilter,
  needsValue,
  operatorInfo,
} from '@/modules/database/components/row-filter'
import { RowFilterForm } from '@/modules/database/components/row-filter-form'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/primitives/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/primitives/popover'

type ColumnOverview = components['schemas']['ColumnOverview']

type RowFilterBarProps = {
  columns: readonly ColumnOverview[]
  filters: readonly RowFilter[]
  onFiltersChange: (filters: RowFilter[]) => void
}

/** The filters on the grid as removable chips, and the popover that adds one more. */
export function RowFilterBar({
  columns,
  filters,
  onFiltersChange,
}: RowFilterBarProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <AddFilter
        columns={columns}
        count={filters.length}
        onAdd={(filter) => onFiltersChange([...filters, filter])}
      />
      {filters.map((filter, index) => (
        <FilterChip
          key={index}
          filter={filter}
          onRemove={() => onFiltersChange(filters.filter((_, position) => position !== index))}
        />
      ))}
      <ClearFilters count={filters.length} onClear={() => onFiltersChange([])} />
    </div>
  )
}

type FilterChipProps = { filter: RowFilter; onRemove: () => void }

function FilterChip({ filter, onRemove }: FilterChipProps): JSX.Element {
  const info = operatorInfo(filter.operator)
  const text = chipText(filter, info.symbol)

  return (
    <span className="inline-flex h-7 max-w-64 items-center gap-1 rounded-md bg-surface-hover ps-2 font-mono text-xs">
      <span className="truncate">{text}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-6"
        aria-label={`Remover filtro ${text}`}
        onClick={onRemove}
      >
        <X aria-hidden />
      </Button>
    </span>
  )
}

function chipText(filter: RowFilter, symbol: string): string {
  if (needsValue(filter.operator)) {
    return `${filter.column} ${symbol} ${filter.value}`
  }

  return `${filter.column} ${symbol}`
}

function ClearFilters({
  count,
  onClear,
}: {
  count: number
  onClear: () => void
}): JSX.Element | null {
  if (count < 2) {
    return null
  }

  return (
    <Button type="button" variant="ghost" size="xs" onClick={onClear}>
      Limpar
    </Button>
  )
}

type AddFilterProps = {
  columns: readonly ColumnOverview[]
  count: number
  onAdd: (filter: RowFilter) => void
}

function AddFilter({ columns, count, onAdd }: AddFilterProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={count >= MAX_ROW_FILTERS}>
          <ListFilter aria-hidden data-icon="inline-start" />
          Filtrar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <RowFilterForm
          columns={columns}
          onAdd={(filter) => {
            onAdd(filter)
            setIsOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
