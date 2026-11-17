import type { JSX } from 'react'

import { FormField } from '@/shared/ui/form-field'

type TypedConfirmationProps = {
  expected: string | undefined
  value: string
  onChange: (value: string) => void
}

/** For actions that cannot be undone at all: the user types the target before confirming. */
export function TypedConfirmation({
  expected,
  value,
  onChange,
}: TypedConfirmationProps): JSX.Element | null {
  if (expected === undefined) {
    return null
  }

  return (
    <FormField
      label={`Digite ${expected} para confirmar`}
      autoFocus
      value={value}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
