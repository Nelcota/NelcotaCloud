import type { JSX } from 'react'

import { TextField } from '@/shared/ui/text-field'

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
    <TextField
      label={`Digite "${expected}" para confirmar`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
      spellCheck={false}
      autoFocus
    />
  )
}
