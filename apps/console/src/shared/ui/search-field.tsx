import { Search, X } from 'lucide-react'
import { useRef, type JSX } from 'react'

import { useSlashFocus } from '@/shared/lib/use-slash-focus'
import { cn } from '@/shared/lib/utils'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/primitives/input-group'
import { Kbd } from '@/shared/ui/primitives/kbd'

type SearchFieldProps = {
  /** The accessible name and the placeholder ("Buscar usuários"). */
  label: string
  value: string
  onValueChange: (value: string) => void
  className?: string
  /** Shows a "/" key and focuses the field when it is pressed outside other fields. */
  hasSlashShortcut?: boolean
}

/** A search box for filtering a list, with a button that clears it. */
export function SearchField({
  label,
  value,
  onValueChange,
  className,
  hasSlashShortcut = false,
}: SearchFieldProps): JSX.Element {
  const input = useRef<HTMLInputElement>(null)
  useSlashFocus(input, hasSlashShortcut)

  function clear(): void {
    onValueChange('')
    input.current?.focus()
  }

  return (
    <InputGroup className={cn("w-full border-transparent sm:max-w-72", className)}>
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
      {value === '' && hasSlashShortcut && (
        <InputGroupAddon
          align="inline-end"
          className="hidden group-focus-within/input-group:hidden sm:flex"
        >
          <Kbd aria-hidden className="font-mono">
            /
          </Kbd>
        </InputGroupAddon>
      )}
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
