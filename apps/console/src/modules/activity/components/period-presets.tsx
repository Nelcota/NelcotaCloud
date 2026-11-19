import Check from '~icons/solar/check-read-linear'
import type { JSX } from 'react'

import {
  type ActivityPeriod,
  PRESETS,
  type PresetDays,
} from '@/modules/activity/model/activity-period'
import { PRESET_LABELS } from '@/modules/activity/model/period-labels'
import { cn } from '@/shared/lib/class-names'

type PeriodPresetsProps = { period: ActivityPeriod; onChoose: (days: PresetDays) => void }

/** The common periods, applied on click; a row of choices on phones, a column beside the calendar. */
export function PeriodPresets({ period, onChoose }: PeriodPresetsProps): JSX.Element {
  return (
    <ul aria-label="Períodos" className="flex flex-wrap gap-1 sm:flex-col sm:flex-nowrap">
      {PRESETS.map((days) => (
        <li key={days}>
          <button
            type="button"
            aria-pressed={days === period}
            onClick={() => onChoose(days)}
            className="hover:bg-accent aria-pressed:bg-accent flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors motion-safe:active:scale-[0.98]"
          >
            <Check
              aria-hidden="true"
              className={cn('size-4 shrink-0', days !== period && 'invisible')}
            />
            {PRESET_LABELS[days]}
          </button>
        </li>
      ))}
    </ul>
  )
}
