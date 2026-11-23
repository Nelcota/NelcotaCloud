import { List as Rows, Plus } from 'lucide-react'
import type { JSX } from 'react'

import { ClearFiltersButton } from '@/modules/database/components/rows-filter-failure'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'

type NoRowsProps = { hasFilters: boolean; onInsert?: () => void; onClearFilters: () => void }

/** An empty first page: the filters to remove, or the first row to insert. */
export function NoRows({ hasFilters, onInsert, onClearFilters }: NoRowsProps): JSX.Element {
  if (hasFilters) {
    return (
      <EmptyState
        isCompact
        title="Nenhuma linha com esses filtros"
        actions={<ClearFiltersButton onClearFilters={onClearFilters} />}
      />
    )
  }

  return (
    <EmptyState
      isCompact
      icon={<Rows aria-hidden />}
      title="Nenhuma linha"
      actions={<InsertAction onInsert={onInsert} />}
    />
  )
}

function InsertAction({ onInsert }: { onInsert?: () => void }): JSX.Element | null {
  if (onInsert === undefined) {
    return null
  }

  return (
    <Button type="button" size="sm" onClick={onInsert}>
      <Plus aria-hidden data-icon="inline-start" />
      Inserir linha
    </Button>
  )
}
