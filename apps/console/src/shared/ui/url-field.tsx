import { useId, type JSX } from 'react'

import { hasScheme } from '@/shared/lib/web-address'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/primitives/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/shared/ui/primitives/input-group'

type UrlFieldProps = {
  label: string
  /** As typed, without the displayed prefix. Use withHttps before submitting. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string
  isRequired?: boolean
  hasAutoFocus?: boolean
}

export function UrlField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  isRequired,
  hasAutoFocus,
}: UrlFieldProps): JSX.Element {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const descriptionIds = [hint && hintId, error && errorId].filter(Boolean).join(' ')

  return (
    <Field className="gap-1.5" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="min-h-9">
        <InputGroupInput
          id={id}
          name="site_url"
          required={isRequired}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={hasAutoFocus}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={descriptionIds || undefined}
        />
        {!hasScheme(value) && (
          <InputGroupAddon aria-hidden>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
