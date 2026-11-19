import Search from '~icons/solar/magnifier-linear'
import type { JSX, Ref } from 'react'

import { cn } from '@/shared/lib/class-names'
import { Input } from '@/shared/ui/input'

type SearchInputProps = {
  /** Also the placeholder: the field has no visible label of its own. */
  label: string
  value: string
  onChange: (value: string) => void
  ref?: Ref<HTMLInputElement>
  /** The key that focuses the field (`aria-keyshortcuts`), when the page binds one. */
  keyShortcut?: string
  /** `lg` for pages that set their content at a larger reading size. */
  size?: 'default' | 'lg'
}

const SIZES = {
  default: { box: 'sm:max-w-xs', icon: 'left-3.5 size-4', input: 'h-9 pl-9.5' },
  lg: { box: '', icon: 'left-4 size-5', input: 'h-11 pl-11 text-base md:text-base' },
} as const

/** A search box with the magnifier inside it, sized for a toolbar. */
export function SearchInput({ ref, ...props }: SearchInputProps): JSX.Element {
  const size = SIZES[props.size ?? 'default']

  return (
    <div className={cn('relative w-full', size.box)}>
      <Search
        aria-hidden="true"
        className={cn(
          'text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2',
          size.icon,
        )}
      />
      <Input
        ref={ref}
        type="search"
        aria-label={props.label}
        aria-keyshortcuts={props.keyShortcut}
        placeholder={props.label}
        className={cn('bg-card dark:bg-card rounded-full border-transparent', size.input)}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <ShortcutHint keyShortcut={props.keyShortcut} isShown={props.value === ''} />
    </div>
  )
}

type ShortcutHintProps = { keyShortcut?: string; isShown: boolean }

/** Shows the key that focuses the field while it is empty; screen readers get `aria-keyshortcuts`. */
function ShortcutHint({ keyShortcut, isShown }: ShortcutHintProps): JSX.Element | null {
  if (keyShortcut === undefined || isShown === false) {
    return null
  }

  return (
    <kbd
      aria-hidden="true"
      className="text-muted-foreground border-border pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border px-1.5 font-mono text-xs leading-5 pointer-fine:block"
    >
      {keyShortcut}
    </kbd>
  )
}
