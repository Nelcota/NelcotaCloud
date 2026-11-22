import type { JSX } from 'react'

import { KIND_OPTIONS, parseKind } from '@/modules/activity/components/activity-filters'
import type { ActivityFiltersControl } from '@/modules/activity/components/use-activity-filters'
import { SearchField } from '@/shared/ui/search-field'
import { SelectField } from '@/shared/ui/select-field'

type LogToolbarProps = {
  control: ActivityFiltersControl
  /** How many events are on screen; `null` while the first page loads. */
  shownCount: number | null
  hasMore: boolean
}

/** Above the log: the search and the kind, both applied by the API, and what is on screen. */
export function LogToolbar({ control, shownCount, hasMore }: LogToolbarProps): JSX.Element {
  const filters = control.filters

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        label="Buscar por email ou IP"
        className="sm:max-w-80"
        value={filters.searchText}
        onValueChange={control.setSearchText}
      />
      <SelectField
        label="Tipo de evento"
        isLabelHidden
        className="w-40"
        options={KIND_OPTIONS}
        value={filters.kind}
        onValueChange={(value) => {
          const kind = parseKind(value)

          if (kind !== null) {
            control.setKind(kind)
          }
        }}
      />
      <span className="ms-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {countText(shownCount, hasMore)}
      </span>
    </div>
  )
}

/** Pages are read by cursor, so the log knows what is loaded, not the total. */
function countText(shownCount: number | null, hasMore: boolean): string {
  if (shownCount === null) {
    return ''
  }

  if (hasMore) {
    return `${shownCount.toLocaleString('pt-BR')} eventos carregados · há mais`
  }

  if (shownCount === 1) {
    return '1 evento'
  }

  return `${shownCount.toLocaleString('pt-BR')} eventos`
}
