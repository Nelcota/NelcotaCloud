import { ChevronDown } from 'lucide-react'
import { useId, type JSX } from 'react'

import type { ColumnDraft } from '@/modules/database/components/column-draft'
import { DEFAULT_SUGGESTIONS } from '@/modules/database/components/column-types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'
import { Field, FieldLabel } from '@/shared/ui/primitives/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/primitives/input-group'

type ColumnDefaultFieldProps = {
  draft: ColumnDraft
  onChange: (change: Partial<ColumnDraft>) => void
}

/** A literal or an expression; common expressions are one pick away. */
export function ColumnDefaultField({ draft, onChange }: ColumnDefaultFieldProps): JSX.Element {
  const id = useId()

  return (
    <Field className="gap-1.5" data-disabled={draft.isIdentity || undefined}>
      <FieldLabel htmlFor={id}>Padrão</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          className="font-mono"
          spellCheck={false}
          autoComplete="off"
          placeholder="Nenhum"
          disabled={draft.isIdentity}
          value={draft.defaultValue}
          onChange={(event) => onChange({ defaultValue: event.target.value })}
        />
        <InputGroupAddon align="inline-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton aria-label="Sugestões de padrão" disabled={draft.isIdentity}>
                <ChevronDown aria-hidden />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DEFAULT_SUGGESTIONS.map((suggestion) => (
                <DropdownMenuItem
                  key={suggestion}
                  className="font-mono"
                  onSelect={() => onChange({ defaultValue: suggestion })}
                >
                  {suggestion}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
