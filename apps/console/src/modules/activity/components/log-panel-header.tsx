import type { JSX } from 'react'

import { KIND_OPTIONS, parseKind } from '@/modules/activity/components/activity-filters'
import { LiveToggle } from '@/modules/activity/components/live-toggle'
import type { ActivityFiltersControl } from '@/modules/activity/components/use-activity-filters'
import { SegmentedControl } from '@/shared/ui/segmented-control'

type LogPanelHeaderProps = {
  control: ActivityFiltersControl
  isLive: boolean
  onLiveChange: (isLive: boolean) => void
}

/** Above the lines: the kind of event (applied by the API) and the live switch. */
export function LogPanelHeader({
  control,
  isLive,
  onLiveChange,
}: LogPanelHeaderProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 [&_[data-slot=toggle-group]]:flex-wrap">
        <SegmentedControl
          label="Tipo de evento"
          isMono
          options={KIND_OPTIONS}
          value={control.filters.kind}
          onValueChange={(value) => {
            const kind = parseKind(value)

            if (kind !== null) {
              control.setKind(kind)
            }
          }}
        />
      </div>
      <LiveToggle isLive={isLive} onLiveChange={onLiveChange} />
    </div>
  )
}
