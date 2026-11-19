import type { JSX } from 'react'

import type { UserStatusFilter as Status } from '@/modules/users/model/user-status-filter'
import { useMatchingUserCountQuery } from '@/modules/users/queries/use-users'
import { FilterPills } from '@/shared/ui/filter-pills'

type UserStatusPickerProps = {
  projectId: string
  /** The search the counts follow, so each pill says how many it would show. */
  search: string
  value: Status
  onChange: (value: Status) => void
}

/**
 * Narrows the list to the accounts that need a hand: unconfirmed emails or blocked users. Each
 * pill carries its count, so "is anyone blocked?" is answered without a click.
 */
export function UserStatusPicker(props: UserStatusPickerProps): JSX.Element {
  const { projectId, search } = props
  const everyone = useMatchingUserCountQuery(projectId, { email: search, status: 'all' }).data
  const unverified = useMatchingUserCountQuery(projectId, {
    email: search,
    status: 'unverified',
  }).data
  const banned = useMatchingUserCountQuery(projectId, { email: search, status: 'banned' }).data
  const options = [
    { value: 'all', label: 'Todos', count: everyone },
    { value: 'unverified', label: 'Não confirmados', count: unverified },
    { value: 'banned', label: 'Bloqueados', count: banned },
  ] as const

  return (
    <FilterPills
      label="Filtrar por situação"
      options={options}
      value={props.value}
      onChange={props.onChange}
      isScrollable
    />
  )
}
