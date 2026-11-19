import Check from '~icons/solar/check-read-linear'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

type CheckFieldProps = {
  label: string
  isChecked: boolean
  onChange: (isChecked: boolean) => void
}

/** A statement to confirm before going on ("Já criei o app"), styled like the console's choices. */
export function CheckField({ label, isChecked, onChange }: CheckFieldProps): JSX.Element {
  return (
    <label
      className={cn(
        'hover:bg-accent/60 has-[:focus-visible]:ring-ring/50 relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-3',
        isChecked && 'border-foreground/50 bg-accent/60',
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        aria-label={label}
        checked={isChecked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cn(
          'border-input flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          isChecked && 'bg-foreground border-foreground text-background',
        )}
      >
        <CheckMark isChecked={isChecked} />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </label>
  )
}

function CheckMark({ isChecked }: { isChecked: boolean }): JSX.Element | null {
  if (isChecked === false) {
    return null
  }

  return <Check className="size-4" />
}
