import type { JSX } from 'react'

import { TextField } from '@/shared/ui/text-field'

/** As in the API: one line, up to 80 characters. */
const MAX_NAME_LENGTH = 80

type EndpointNameFieldProps = { value: string; onChange: (value: string) => void }

/** An optional name that tells endpoints apart where hosts repeat ("Sincronizar CRM"). */
export function EndpointNameField({ value, onChange }: EndpointNameFieldProps): JSX.Element {
  return (
    <TextField
      label="Nome"
      isOptional
      placeholder="Sincronizar CRM"
      maxLength={MAX_NAME_LENGTH}
      value={value}
      onChange={(change) => onChange(change.target.value)}
    />
  )
}
