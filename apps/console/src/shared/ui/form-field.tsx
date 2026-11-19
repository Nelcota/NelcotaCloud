import type { ComponentProps, JSX } from 'react'
import { useId } from 'react'

import { cn } from '@/shared/lib/class-names'
import { describedBy } from '@/shared/lib/described-by'
import { fieldIconPadding } from '@/shared/lib/field-icon-padding'
import { visibleHint } from '@/shared/lib/visible-hint'
import { FieldErrorText } from '@/shared/ui/field-error-text'
import { FieldIcon } from '@/shared/ui/field-icon'
import type { IconComponent } from '@/shared/ui/icon-component'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useFieldError } from '@/shared/ui/use-field-error'

type FormFieldProps = ComponentProps<typeof Input> & {
  label: string
  hint?: string
  /** What to say when the value does not match `pattern`, instead of the browser's generic text. */
  patternMessage?: string
  /** An icon at the start of the input, for fields people scan for (email, password). */
  icon?: IconComponent
}

/** A labelled input with an optional hint and its validation problem, linked for screen readers. */
export function FormField(props: FormFieldProps): JSX.Element {
  const { label, hint, patternMessage, icon, className, ...inputProps } = props
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const fieldError = useFieldError(patternMessage)

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <FieldIcon icon={icon} />
        <Input
          id={id}
          aria-describedby={describedBy([
            fieldError.message !== '' && errorId,
            hint !== undefined && fieldError.message === '' && hintId,
          ])}
          aria-invalid={fieldError.message !== '' || undefined}
          onInvalid={fieldError.onInvalid}
          onInput={fieldError.onInput}
          className={cn(fieldIconPadding(icon), className)}
          {...inputProps}
        />
      </div>
      <FieldErrorText id={errorId} message={fieldError.message} />
      <FieldHint id={hintId} hint={visibleHint(hint, fieldError.message)} />
    </div>
  )
}

function FieldHint({ id, hint }: { id: string; hint?: string }): JSX.Element | null {
  if (hint === undefined) {
    return null
  }

  return (
    <p id={id} data-slot="field-hint" className="text-muted-foreground text-xs">
      {hint}
    </p>
  )
}
