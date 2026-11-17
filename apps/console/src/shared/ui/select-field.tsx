import type { ComponentProps, JSX } from 'react'
import { useId } from 'react'

import { cn } from '@/shared/lib/class-names'
import { Label } from '@/shared/ui/label'

type SelectFieldProps = ComponentProps<'select'> & {
  label: string
  hint?: string
}

/** A labelled native select, styled like `Input`, with an optional hint linked for screen readers. */
export function SelectField({
  label,
  hint,
  className,
  ...selectProps
}: SelectFieldProps): JSX.Element {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        aria-describedby={describedBy(hint, hintId)}
        className={cn(
          'border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 *:bg-popover *:text-popover-foreground h-10 w-full min-w-0 rounded-lg border bg-transparent px-3 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        {...selectProps}
      />
      <FieldHint id={hintId} hint={hint} />
    </div>
  )
}

function describedBy(hint: string | undefined, hintId: string): string | undefined {
  if (hint === undefined) {
    return undefined
  }

  return hintId
}

function FieldHint({ id, hint }: { id: string; hint?: string }): JSX.Element | null {
  if (hint === undefined) {
    return null
  }

  return (
    <p id={id} className="text-muted-foreground text-xs">
      {hint}
    </p>
  )
}
