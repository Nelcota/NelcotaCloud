import type { JSX } from 'react'

import { TextField } from '@/shared/ui/text-field'

/** Six digits, plus the space some apps show in the middle ("123 456"). */
const MAX_CODE_LENGTH = 7
const NOT_CODE_CHARACTERS = /[^0-9 ]/g

type TotpCodeFieldProps = {
  value: string
  onChange: (value: string) => void
  hasAutoFocus?: boolean
}

/** The six digits from an authenticator app. */
export function TotpCodeField({ value, onChange, hasAutoFocus }: TotpCodeFieldProps): JSX.Element {
  return (
    <TextField
      label="Código do autenticador"
      inputMode="numeric"
      autoComplete="one-time-code"
      required
      autoFocus={hasAutoFocus}
      className="max-w-52 [&_input]:h-10 [&_input]:font-mono [&_input]:tracking-[0.2em]"
      value={value}
      onChange={(event) => onChange(codeOf(event.target.value))}
    />
  )
}

function codeOf(typed: string): string {
  return typed.replace(NOT_CODE_CHARACTERS, '').slice(0, MAX_CODE_LENGTH)
}
