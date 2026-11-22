import { useId, type ComponentProps, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { FieldMessages } from '@/shared/ui/field-messages'
import { describedBy } from '@/shared/ui/field-ids'
import { Field, FieldLabel } from '@/shared/ui/primitives/field'
import { Input } from '@/shared/ui/primitives/input'
import { Textarea } from '@/shared/ui/primitives/textarea'

type LabelledProps = {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  /** Keeps the label for screen readers only, where the context already names the field. */
  isLabelHidden?: boolean
  /** Shown after the label for optional fields. */
  isOptional?: boolean
  className?: string
}

type TextFieldProps = Omit<ComponentProps<typeof Input>, 'className'> & LabelledProps

/** A labelled text input with its hint and error, built from the shadcn Field parts. */
export function TextField({
  label,
  hint,
  error,
  isLabelHidden,
  isOptional,
  className,
  id,
  ...props
}: TextFieldProps): JSX.Element {
  const generatedId = useId()
  const controlId = id ?? generatedId

  return (
    <Field className={cn('gap-1.5', className)} data-invalid={hasError(error)}>
      <FieldCaption htmlFor={controlId} isHidden={isLabelHidden} isOptional={isOptional}>
        {label}
      </FieldCaption>
      <Input
        id={controlId}
        aria-invalid={hasError(error)}
        aria-describedby={describedBy(controlId, hint, error)}
        {...props}
      />
      <FieldMessages id={controlId} hint={hint} error={error} />
    </Field>
  )
}

type TextAreaFieldProps = Omit<ComponentProps<typeof Textarea>, 'className'> &
  LabelledProps & { isCode?: boolean }

export function TextAreaField({
  label,
  hint,
  error,
  isLabelHidden,
  isOptional,
  isCode,
  className,
  id,
  ...props
}: TextAreaFieldProps): JSX.Element {
  const generatedId = useId()
  const controlId = id ?? generatedId

  return (
    <Field className={cn('gap-1.5', className)} data-invalid={hasError(error)}>
      <FieldCaption htmlFor={controlId} isHidden={isLabelHidden} isOptional={isOptional}>
        {label}
      </FieldCaption>
      <Textarea
        id={controlId}
        className={cn(isCode === true && 'font-mono text-xs')}
        aria-invalid={hasError(error)}
        aria-describedby={describedBy(controlId, hint, error)}
        {...props}
      />
      <FieldMessages id={controlId} hint={hint} error={error} />
    </Field>
  )
}

function FieldCaption({
  htmlFor,
  isHidden,
  isOptional,
  children,
}: {
  htmlFor: string
  isHidden?: boolean
  isOptional?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <FieldLabel htmlFor={htmlFor} className={cn(isHidden === true && 'sr-only')}>
      {children}
      {isOptional === true && <span className="font-normal text-muted-foreground">(opcional)</span>}
    </FieldLabel>
  )
}

function hasError(error: ReactNode): true | undefined {
  if (error === undefined || error === null || error === '' || error === false) {
    return undefined
  }

  return true
}
