import type { ComponentProps, JSX } from 'react'
import { useId } from 'react'

import { Label } from '@/shared/ui/label'

type TextAreaFieldProps = ComponentProps<'textarea'> & {
  label: string
  hint?: string
}

/** A labelled multi-line text field with an optional hint, linked for screen readers. */
export function TextAreaField({ label, hint, ...textAreaProps }: TextAreaFieldProps): JSX.Element {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={3}
        aria-describedby={describedBy(hint, hintId)}
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
        {...textAreaProps}
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
