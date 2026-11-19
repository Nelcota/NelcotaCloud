import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

type FilterPillsProps<Value extends string> = {
  /** Names the group for screen readers: what the pills choose between. */
  label: string
  /** `count`, when known, reads after the label: how many items that choice shows. */
  options: readonly { value: Value; label: string; count?: number }[]
  value: Value
  onChange: (value: Value) => void
  /** `lg` for pages that set their content at a larger reading size. */
  size?: 'default' | 'lg'
  /** One line that scrolls sideways instead of wrapping, for narrow toolbars. */
  isScrollable?: boolean
}

const SIZE_CLASSES = {
  default: 'h-9 px-3.5 text-sm pointer-coarse:h-11',
  lg: 'h-10 px-4.5 text-base',
} as const

/** A row of pill toggles where exactly one is on: a filter or a view of the same list. */
export function FilterPills<Value extends string>(props: FilterPillsProps<Value>): JSX.Element {
  const sizeClass = SIZE_CLASSES[props.size ?? 'default']

  return (
    <div
      role="group"
      aria-label={props.label}
      className={cn(
        'flex w-fit gap-1.5',
        props.isScrollable === true && 'max-w-full overflow-x-auto [scrollbar-width:none]',
        props.isScrollable !== true && 'flex-wrap',
      )}
    >
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === props.value}
          onClick={() => props.onChange(option.value)}
          className={cn(
            'text-muted-foreground hover:bg-foreground/6 hover:text-foreground border-border rounded-full border font-medium whitespace-nowrap transition-[color,background-color,border-color,transform]',
            sizeClass,
            option.value === props.value &&
              'bg-foreground text-background hover:bg-foreground/90 hover:text-background border-transparent',
          )}
        >
          {option.label}
          <PillCount count={option.count} />
        </button>
      ))}
    </div>
  )
}

function PillCount({ count }: { count?: number }): JSX.Element | null {
  if (count === undefined) {
    return null
  }

  return <span className="ml-1.5 tabular-nums opacity-70">{count.toLocaleString('pt-BR')}</span>
}
