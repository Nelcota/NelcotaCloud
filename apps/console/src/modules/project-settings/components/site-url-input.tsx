import type { JSX } from 'react'

import { hasScheme } from '@/shared/lib/web-address'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/shared/ui/primitives/input-group'

type SiteUrlInputProps = {
  id: string
  /** As typed, without the displayed `https://`. */
  value: string
  onChange: (value: string) => void
  describedBy?: string
}

/** The address field of a settings row, which labels it; `https://` shows until a scheme is typed. */
export function SiteUrlInput({ id, value, onChange, describedBy }: SiteUrlInputProps): JSX.Element {
  return (
    <InputGroup className="min-h-9">
      <InputGroupInput
        id={id}
        name="site_url"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="app.exemplo.com"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-describedby={describedBy}
      />
      <SchemeAddon value={value} />
    </InputGroup>
  )
}

function SchemeAddon({ value }: { value: string }): JSX.Element | null {
  if (hasScheme(value)) {
    return null
  }

  return (
    <InputGroupAddon aria-hidden>
      <InputGroupText>https://</InputGroupText>
    </InputGroupAddon>
  )
}
