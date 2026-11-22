import { Plus, RefreshCw as Refresh } from 'lucide-react'
import type { JSX } from 'react'

import type { RowFilter } from '@/modules/database/components/row-filter'
import { RowFilterBar } from '@/modules/database/components/row-filter-bar'
import type { components } from '@/shared/api/api-schema'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'

type ColumnOverview = components['schemas']['ColumnOverview']

type RowsToolbarProps = {
  columns: readonly ColumnOverview[]
  filters: readonly RowFilter[]
  onFiltersChange: (filters: RowFilter[]) => void
  isRefreshing: boolean
  onRefresh: () => void
  /** Absent on views and tables without a primary key, where rows cannot be changed. */
  onInsert?: () => void
}

/** Above the grid: the filters, a way to read the rows again and to add one. */
export function RowsToolbar(props: RowsToolbarProps): JSX.Element {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-surface px-2 py-1.5">
      <RowFilterBar
        columns={props.columns}
        filters={props.filters}
        onFiltersChange={props.onFiltersChange}
      />
      <div className="flex items-center gap-1.5">
        <PendingButton
          type="button"
          variant="ghost"
          size="sm"
          isPending={props.isRefreshing}
          onClick={props.onRefresh}
        >
          <Refresh aria-hidden data-icon="inline-start" />
          Atualizar
        </PendingButton>
        <InsertButton onInsert={props.onInsert} />
      </div>
    </div>
  )
}

function InsertButton({ onInsert }: { onInsert?: () => void }): JSX.Element | null {
  if (onInsert === undefined) {
    return null
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onInsert}>
      <Plus aria-hidden data-icon="inline-start" />
      Linha
    </Button>
  )
}
