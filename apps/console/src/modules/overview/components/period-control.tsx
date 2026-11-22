import type { JSX } from 'react'

import { SegmentedControl } from '@/shared/ui/segmented-control'

/** The periods the overview can cover; the API keeps 90 days of logins. */
const PERIOD_OPTIONS = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
] as const

type PeriodControlProps = {
  days: number
  onDaysChange: (days: number) => void
}

/** The overview's one filter: the figures, the chart and the refused logins follow it. */
export function PeriodControl({ days, onDaysChange }: PeriodControlProps): JSX.Element {
  function choose(value: string): void {
    const option = PERIOD_OPTIONS.find((candidate) => candidate.value === value)

    if (option === undefined) {
      return
    }

    onDaysChange(Number(option.value))
  }

  return (
    <SegmentedControl
      label="Período"
      options={PERIOD_OPTIONS}
      value={String(days)}
      onValueChange={choose}
      isMono
    />
  )
}
