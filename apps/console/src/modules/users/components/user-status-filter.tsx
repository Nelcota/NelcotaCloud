import type { JSX } from 'react'

import type { UserStatusFilter as Status } from '@/modules/users/api/list-users'
import { SegmentedControl } from '@/shared/ui/segmented-control'

const STATUSES: readonly Status[] = ['all', 'unverified', 'banned']

const OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'unverified', label: 'Não confirmados' },
  { value: 'banned', label: 'Bloqueados' },
] as const

type UserStatusFilterProps = {
  value: Status
  onChange: (value: Status) => void
}

/** Narrows the list to the accounts that need a hand: unconfirmed emails or blocked users. */
export function UserStatusFilter({ value, onChange }: UserStatusFilterProps): JSX.Element {
  return (
    <SegmentedControl
      label="Filtrar por situação"
      options={OPTIONS}
      value={value}
      onValueChange={(selected) => onChange(toStatus(selected))}
    />
  )
}

function toStatus(value: string): Status {
  return STATUSES.find((status) => status === value) ?? 'all'
}
