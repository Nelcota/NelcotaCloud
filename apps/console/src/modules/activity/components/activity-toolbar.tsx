import type { JSX } from 'react'

import { KIND_OPTIONS, parseKind } from '@/modules/activity/components/activity-filters'
import { LiveToggle } from '@/modules/activity/components/live-toggle'
import type { ActivityFiltersControl } from '@/modules/activity/components/use-activity-filters'
import { SearchField } from '@/shared/ui/search-field'
import { SelectField } from '@/shared/ui/select-field'

type ActivityToolbarProps = {
  control: ActivityFiltersControl
  live: { isLive: boolean; onLiveChange: (isLive: boolean) => void }
  /** Applies the search at once instead of after the typing pause. */
  onSearchNow: () => void
}

/** Above the feed: the search and the kind (both applied by the API), and the live switch. */
export function ActivityToolbar({ control, live, onSearchNow }: ActivityToolbarProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <form
        role="search"
        className="min-w-0 basis-full sm:max-w-80 sm:flex-1 sm:basis-auto"
        onSubmit={(submit) => {
          submit.preventDefault()
          onSearchNow()
        }}
      >
        <SearchField
          label="Buscar por email ou IP"
          className="sm:max-w-none"
          value={control.filters.searchText}
          onValueChange={control.setSearchText}
        />
      </form>
      <SelectField
        label="Tipo de evento"
        isLabelHidden
        className="w-40"
        options={KIND_OPTIONS}
        value={control.filters.kind}
        onValueChange={(value) => {
          const kind = parseKind(value)

          if (kind !== null) {
            control.setKind(kind)
          }
        }}
      />
      <div className="ms-auto">
        <LiveToggle isLive={live.isLive} onLiveChange={live.onLiveChange} />
      </div>
    </div>
  )
}
