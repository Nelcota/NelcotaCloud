import AltArrowDown from '~icons/solar/alt-arrow-down-linear'
import Calendar from '~icons/solar/calendar-linear'
import type { JSX } from 'react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { PeriodPresets } from '@/modules/activity/components/period-presets'
import { RangeApply } from '@/modules/activity/components/range-apply'
import {
  type ActivityPeriod,
  RETENTION_DAYS,
  isDayRange,
  localDate,
} from '@/modules/activity/model/activity-period'
import { periodLabel, periodShortLabel } from '@/modules/activity/model/period-labels'
import { cn } from '@/shared/lib/class-names'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { RangeCalendar } from '@/shared/ui/range-calendar'

type PeriodPickerProps = {
  period: ActivityPeriod
  onChange: (period: ActivityPeriod) => void
  /** Placement in the row (how it grows), set by the toolbar. */
  className?: string
}

/** The presets one click away, and a calendar for any days the log still keeps. */
export function PeriodPicker({ period, onChange, className }: PeriodPickerProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)
  const bounds = calendarBounds()

  // Each opening starts from the period in use, not from an unapplied pick.
  function changeOpen(open: boolean): void {
    if (open) {
      setDraft(rangeOf(period))
    }

    setIsOpen(open)
  }

  function choose(next: ActivityPeriod): void {
    onChange(next)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={changeOpen}>
      <PopoverTrigger
        aria-label={`Período: ${periodLabel(period)}`}
        className={cn(
          'bg-card hover:bg-accent aria-expanded:bg-accent flex h-11 min-w-0 items-center gap-2 rounded-full px-4 text-base font-medium whitespace-nowrap transition-colors',
          className,
        )}
      >
        <Calendar
          aria-hidden="true"
          className="text-muted-foreground hidden size-5 shrink-0 @3xl:block"
        />
        <span className="truncate @3xl:hidden">{periodShortLabel(period)}</span>
        <span className="hidden truncate @3xl:inline">{periodLabel(period)}</span>
        <AltArrowDown
          aria-hidden="true"
          className="text-muted-foreground ml-auto size-4 shrink-0"
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="grid gap-3 sm:grid-cols-[10rem_auto]">
        <PeriodPresets period={period} onChoose={choose} />
        <div className="grid gap-3">
          <RangeCalendar
            selected={draft}
            onSelect={setDraft}
            disabled={[{ before: bounds.first }, { after: bounds.last }]}
            months={bounds}
          />
          <RangeApply draft={draft} onApply={choose} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** From the oldest day the log keeps to today. */
function calendarBounds(): { first: Date; last: Date } {
  const last = new Date()
  last.setHours(0, 0, 0, 0)
  const first = new Date(last)
  first.setDate(first.getDate() - RETENTION_DAYS)

  return { first, last }
}

function rangeOf(period: ActivityPeriod): DateRange | undefined {
  if (isDayRange(period) === false) {
    return undefined
  }

  return { from: localDate(period.from), to: localDate(period.to) }
}
