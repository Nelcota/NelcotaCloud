import type { JSX } from 'react'

import type { UserStatusFilter as Status } from '@/modules/users/api/list-users'
import { countLabel } from '@/modules/users/components/user-count-label'
import { UserStatusFilter } from '@/modules/users/components/user-status-filter'
import { SearchField } from '@/shared/ui/search-field'

type UsersToolbarProps = {
  filter: { search: string; status: Status }
  /** How many users match; `undefined` while the first page loads. */
  total: number | undefined
  onChange: (next: { search: string; status: Status }) => void
}

/** Above the users table: the email search, the status filter and how many match. */
export function UsersToolbar({ filter, total, onChange }: UsersToolbarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        label="Buscar por email"
        className="sm:max-w-72"
        value={filter.search}
        onValueChange={(search) => onChange({ ...filter, search })}
      />
      <div className="scrollbar-thin max-w-full overflow-x-auto">
        <UserStatusFilter
          value={filter.status}
          onChange={(status) => onChange({ ...filter, status })}
        />
      </div>
      <span className="ms-auto text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {totalText(total)}
      </span>
    </div>
  )
}

function totalText(total: number | undefined): string {
  if (total === undefined) {
    return ''
  }

  return countLabel(total)
}
