import AltArrowDown from '~icons/solar/alt-arrow-down-linear'
import Check from '~icons/solar/check-read-linear'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'
import type { IconComponent } from '@/shared/ui/icon-component'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type ChoiceMenuProps<Value extends string> = {
  /** What the menu chooses, for screen readers ("Período"). */
  label: string
  icon: IconComponent
  /** `shortLabel` names the choice on the button while the row is narrow. */
  options: readonly { value: Value; label: string; shortLabel: string }[]
  value: Value
  onChange: (value: Value) => void
  /** Placement in the row (how it grows), set by the toolbar. */
  className?: string
}

/** One compact button that shows the current choice and opens the others; one row, no pill wall. */
export function ChoiceMenu<Value extends string>(props: ChoiceMenuProps<Value>): JSX.Element {
  const Icon = props.icon
  const current = props.options.find((option) => option.value === props.value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${props.label}: ${current?.label ?? ''}`}
        className={cn(
          'bg-card hover:bg-accent aria-expanded:bg-accent flex h-11 min-w-0 items-center gap-2 rounded-full px-4 text-base font-medium whitespace-nowrap transition-colors',
          props.className,
        )}
      >
        <Icon
          aria-hidden="true"
          className="text-muted-foreground hidden size-5 shrink-0 @3xl:block"
        />
        <span className="truncate @3xl:hidden">{current?.shortLabel}</span>
        <span className="hidden truncate @3xl:inline">{current?.label}</span>
        <AltArrowDown
          aria-hidden="true"
          className="text-muted-foreground ml-auto size-4 shrink-0"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {props.options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            role="menuitemradio"
            aria-checked={option.value === props.value}
            onClick={() => props.onChange(option.value)}
            className="text-base"
          >
            <Check
              aria-hidden="true"
              className={cn('size-4', option.value !== props.value && 'invisible')}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
