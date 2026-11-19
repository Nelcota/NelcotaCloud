import Check from '~icons/solar/check-read-linear'
import Minus from '~icons/solar/minus-linear'
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { cn } from '@/shared/lib/class-names'

export type CheckState = 'checked' | 'unchecked' | 'mixed'

type CheckboxProps = {
  /** The accessible name; a row checkbox has no visible label of its own. */
  label: string
  state: CheckState
  onChange: (isChecked: boolean) => void
}

/**
 * A bare checkbox for selecting rows, drawn like the console's check cards (8px radius, filled
 * in the foreground colour, never mint). "Mixed" marks a header when only some rows are picked.
 */
export function Checkbox({ label, state, onChange }: CheckboxProps): JSX.Element {
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (input.current === null) {
      return
    }

    input.current.indeterminate = state === 'mixed'
  }, [state])

  return (
    <label className="group/check relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md pointer-coarse:size-11">
      <input
        ref={input}
        type="checkbox"
        className="peer sr-only"
        aria-label={label}
        checked={state === 'checked'}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cn(
          'border-input peer-focus-visible:ring-ring/50 flex size-5 items-center justify-center rounded-md border transition-[background-color,border-color,scale] group-hover/check:border-foreground/40 group-active/check:scale-90 peer-focus-visible:ring-3 motion-reduce:transition-none motion-reduce:group-active/check:scale-100',
          state !== 'unchecked' && 'bg-foreground border-foreground text-background',
        )}
      >
        <CheckMark state={state} />
      </span>
    </label>
  )
}

function CheckMark({ state }: { state: CheckState }): JSX.Element | null {
  if (state === 'checked') {
    return <Check className="size-4" />
  }

  if (state === 'mixed') {
    return <Minus className="size-4" />
  }

  return null
}
