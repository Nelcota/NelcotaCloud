import { Search, X } from 'lucide-react'
import { useRef, type JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/primitives/input-group'

type SearchFieldProps = {
  /** The accessible name and the placeholder ("Buscar usuários"). */
  label: string
  value: string
  onValueChange: (value: string) => void
  className?: string
}

/** A search box for filtering a list, with a button that clears it. */
export function SearchField({
  label,
  value,
  onValueChange,
  className,
}: SearchFieldProps): JSX.Element {
  const input = useRef<HTMLInputElement>(null)

  function clear(): void {
    onValueChange('')
    input.current?.focus()
  }

  return (
    <InputGroup className={cn('w-full sm:max-w-72', className)}>
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        type="search"
        aria-label={label}
        placeholder={`${label}…`}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {value !== '' && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Limpar busca" onClick={clear}>
            <X aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
