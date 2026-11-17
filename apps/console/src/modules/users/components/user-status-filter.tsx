import type { JSX } from 'react'

import type { UserStatusFilter as Status } from '@/modules/users/api/list-users'
import { cn } from '@/shared/lib/class-names'

const OPTIONS: readonly { value: Status; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'unverified', label: 'Não confirmados' },
  { value: 'banned', label: 'Bloqueados' },
]

type UserStatusFilterProps = {
  value: Status
  onChange: (value: Status) => void
}

/** Narrows the list to the accounts that need a hand: unconfirmed emails or blocked users. */
export function UserStatusFilter({ value, onChange }: UserStatusFilterProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Filtrar por situação"
      className="bg-muted/40 flex w-fit rounded-lg border p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,background-color,transform] active:scale-[0.97] motion-reduce:active:scale-100',
            option.value === value && 'bg-accent text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
