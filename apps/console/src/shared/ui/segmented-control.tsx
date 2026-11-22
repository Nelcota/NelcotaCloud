import type { JSX } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/primitives/toggle-group'

export type SegmentOption = { label: string; value: string }

type SegmentedControlProps = {
  label: string
  options: readonly SegmentOption[]
  value: string
  onValueChange: (value: string) => void
}

/** A choice among 2 to 5 views or filters ("Todos", "Não verificados", "Banidos"). */
export function SegmentedControl(props: SegmentedControlProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label={props.label}
      value={props.value}
      onValueChange={(value) => {
        if (value !== '') {
          props.onValueChange(value)
        }
      }}
    >
      {props.options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="px-3">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
