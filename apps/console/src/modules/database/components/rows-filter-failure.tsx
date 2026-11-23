import { FilterX } from 'lucide-react'
import type { JSX } from 'react'

import { describeError } from '@/shared/api/describe-error'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'

type RowsFilterFailureProps = { error: Error; onClearFilters: () => void }

/**
 * Filtered rows that failed to load: retrying would send the same filter, so the way out is to
 * remove it, with the toolbar still above to edit it instead.
 */
export function RowsFilterFailure({ error, onClearFilters }: RowsFilterFailureProps): JSX.Element {
  return (
    <EmptyState
      isCompact
      icon={<FilterX aria-hidden />}
      title="Os filtros não puderam ser aplicados"
      description={describeError(error)}
      actions={<ClearFiltersButton onClearFilters={onClearFilters} />}
    />
  )
}

/** Removes every filter of the grid. */
export function ClearFiltersButton({
  onClearFilters,
}: {
  onClearFilters: () => void
}): JSX.Element {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
      <FilterX aria-hidden data-icon="inline-start" />
      Remover filtros
    </Button>
  )
}
