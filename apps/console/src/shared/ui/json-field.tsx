import type { JSX } from 'react'

import { TextAreaField } from '@/shared/ui/text-field'

type JsonFieldProps = {
  label: string
  hint: string
  value: string
  error: string | null
  onChange: (value: string) => void
}

/** A labelled text area for a JSON document, with its hint or its parse error. */
export function JsonField(props: JsonFieldProps): JSX.Element {
  return (
    <TextAreaField
      label={props.label}
      hint={props.hint}
      error={props.error ?? undefined}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      rows={6}
      spellCheck={false}
      isCode
    />
  )
}
