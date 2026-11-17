import type { JSX } from 'react'

type TextFieldProps = {
  label: string
  type: 'email' | 'password' | 'text'
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}

export function TextField({ label, onChange, ...input }: TextFieldProps): JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...input} required onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
