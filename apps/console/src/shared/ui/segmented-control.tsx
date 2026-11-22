import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/primitives/toggle-group'

export type SegmentOption = { label: string; value: string }

type SegmentedControlProps = {
  label: string
  options: readonly SegmentOption[]
  value: string
  onValueChange: (value: string) => void
  /** Periods and short codes ("24h", "7d") read in the mono face, like the panel's time pills. */
  isMono?: boolean
}

/** Pills for a choice among 2 to 7 views, filters or periods ("Todos", "Não verificados", "Banidos"). */
export function SegmentedControl(props: SegmentedControlProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="default"
      size="sm"
      spacing={0.5}
      className={cn(props.isMono === true && 'font-mono')}
      aria-label={props.label}
      value={props.value}
      onValueChange={(value) => {
        if (value !== '') {
          props.onValueChange(value)
        }
      }}
    >
      {props.options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="px-2.5">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
