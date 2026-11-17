import Search from '~icons/solar/magnifier-linear'
import type { JSX } from 'react'

import { Input } from '@/shared/ui/input'

type SearchInputProps = {
  /** Also the placeholder: the field has no visible label of its own. */
  label: string
  value: string
  onChange: (value: string) => void
}

/** A search box with the magnifier inside it, sized for a toolbar. */
export function SearchInput({ label, value, onChange }: SearchInputProps): JSX.Element {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        className="pl-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
