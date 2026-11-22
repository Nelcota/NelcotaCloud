import { SearchX } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { countLabel } from '@/modules/database/components/count-label'
import {
  type TableFilter,
  filterTables,
  isTableFilter,
} from '@/modules/database/components/table-filter'
import { isRlsOff } from '@/modules/database/components/table-kinds'
import { TablesTable } from '@/modules/database/components/tables-table'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'
import { SearchField } from '@/shared/ui/search-field'
import { SegmentedControl } from '@/shared/ui/segmented-control'

type TableOverview = components['schemas']['TableOverview']

type FilteredTablesProps = { projectId: string; tables: TableOverview[] }

/** The tables in a framed list, with a name search, a filter for tables without RLS and a count. */
export function FilteredTables({ projectId, tables }: FilteredTablesProps): JSX.Element {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TableFilter>('all')
  const visible = filterTables(tables, filter, search)
  const openCount = tables.filter(isRlsOff).length

  function pickFilter(value: string): void {
    if (isTableFilter(value)) {
      setFilter(value)
    }
  }

  function clearFilters(): void {
    setSearch('')
    setFilter('all')
  }

  return (
    <section
      aria-label="Tabelas do schema public"
      className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <SearchField label="Buscar tabela" value={search} onValueChange={setSearch} />
        <SegmentedControl
          label="Filtrar tabelas"
          value={filter}
          onValueChange={pickFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'rls-off', label: `Sem RLS · ${formatCount(openCount)}` },
          ]}
        />
        <span className="ms-auto text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {visibleCount(visible.length, tables.length)}
        </span>
      </div>
      <VisibleTables projectId={projectId} tables={visible} onClear={clearFilters} />
    </section>
  )
}

function visibleCount(shown: number, total: number): string {
  if (shown === total) {
    return countLabel(total, 'tabela', 'tabelas')
  }

  return `${formatCount(shown)} de ${countLabel(total, 'tabela', 'tabelas')}`
}

type VisibleTablesProps = { projectId: string; tables: TableOverview[]; onClear: () => void }

function VisibleTables({ projectId, tables, onClear }: VisibleTablesProps): JSX.Element {
  if (tables.length === 0) {
    return (
      <EmptyState
        isCompact
        icon={<SearchX aria-hidden />}
        title="Nenhuma tabela encontrada"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Limpar filtros
          </Button>
        }
      />
    )
  }

  return <TablesTable projectId={projectId} tables={tables} />
}
