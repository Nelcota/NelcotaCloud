import type { JSX } from 'react'
import { useId } from 'react'

import { hasScheme } from '@/shared/lib/web-address'
import { cn } from '@/shared/lib/class-names'
import { Label } from '@/shared/ui/label'

type UrlFieldProps = {
  label: string
  /** What was typed, without the `https://` the field shows; send it through `withHttps`. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  required?: boolean
  autoFocus?: boolean
}

/**
 * An address field that writes `https://` for the user: it shows the prefix in front of what is
 * typed, and hides it as soon as a scheme is typed or pasted (`http://localhost:5173`).
 */
export function UrlField(props: UrlFieldProps): JSX.Element {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{props.label}</Label>
      <div className="border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex h-10 min-w-0 items-center rounded-lg border bg-transparent transition-colors focus-within:ring-3">
        <SchemePrefix value={props.value} />
        <input
          id={id}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required={props.required}
          autoFocus={props.autoFocus}
          placeholder={props.placeholder}
          aria-describedby={describedBy(props.hint, hintId)}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className={cn(
            'placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent pr-3 text-base outline-none md:text-sm',
            hasScheme(props.value) && 'pl-3',
          )}
        />
      </div>
      <FieldHint id={hintId} hint={props.hint} />
    </div>
  )
}

function SchemePrefix({ value }: { value: string }): JSX.Element | null {
  if (hasScheme(value)) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      className="text-muted-foreground pl-3 text-base select-none md:text-sm"
    >
      https://
    </span>
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
