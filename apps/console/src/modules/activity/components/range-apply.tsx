import type { JSX } from 'react'
import type { DateRange } from 'react-day-picker'

import { type DayRange, dayOf } from '@/modules/activity/model/activity-period'
import { rangeLabel } from '@/modules/activity/model/period-labels'
import { Button } from '@/shared/ui/button'

type RangeApplyProps = { draft: DateRange | undefined; onApply: (range: DayRange) => void }

/** The days picked so far and the button that uses them; one picked day is a range of one. */
export function RangeApply({ draft, onApply }: RangeApplyProps): JSX.Element {
  const range = dayRangeOfDraft(draft)

  if (range === undefined) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">Escolha os dias</span>
        <Button disabled>Aplicar</Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium tabular-nums">{rangeLabel(range)}</span>
      <Button onClick={() => onApply(range)}>Aplicar</Button>
    </div>
  )
}

function dayRangeOfDraft(draft: DateRange | undefined): DayRange | undefined {
  const from = draft?.from

  if (from === undefined) {
    return undefined
  }

  const to = draft?.to ?? from

  return { from: dayOf(from), to: dayOf(to) }
}
