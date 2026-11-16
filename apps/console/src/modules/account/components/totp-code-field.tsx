import type { JSX } from 'react'

import { FormField } from '@/shared/ui/form-field'

type TotpCodeFieldProps = {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

/** The six digits from an authenticator app. */
export function TotpCodeField({ value, onChange, autoFocus }: TotpCodeFieldProps): JSX.Element {
  return (
    <FormField
      label="Código do autenticador"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9 ]{6,7}"
      required
      autoFocus={autoFocus}
      maxLength={7}
      className="max-w-48 font-mono tracking-[0.3em]"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
