import type { ComponentProps, JSX } from 'react'
import { useId } from 'react'

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type FormFieldProps = ComponentProps<typeof Input> & {
  label: string
  hint?: string
}

/** A labelled input with an optional hint, linked for screen readers. */
export function FormField({ label, hint, ...inputProps }: FormFieldProps): JSX.Element {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-describedby={describedBy(hint, hintId)} {...inputProps} />
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
