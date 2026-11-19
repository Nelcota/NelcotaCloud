import DownloadMinimalistic from '~icons/solar/download-minimalistic-linear'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect } from 'react'

import { UsersBrowser } from '@/modules/users/components/users-browser'
import { rememberUsersSearch } from '@/modules/users/model/last-users-search'
import {
  type UsersFilter,
  searchForUsersFilter,
  usersFilterOf,
} from '@/modules/users/model/users-search'
import { useExportUsers } from '@/modules/users/queries/use-export-users'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'

const ROUTE_ID = '/_authenticated/projects/$projectId/users'
const ROUTE_PATH = '/projects/$projectId/users'

export function UsersPage(): JSX.Element {
  const projectId = useProjectId()
  const search = useSearch({ from: ROUTE_ID })
  const filter = usersFilterOf(search)
  const navigate = useNavigate({ from: ROUTE_PATH })
  const exporting = useExportUsers(projectId)

  // So "← Usuários" on a user's page returns to this same list and page.
  useEffect(() => {
    rememberUsersSearch(projectId, search)
  }, [projectId, search])

  // Typing replaces the entry, so each letter is not a step of the Back button; paging and a
  // new status are steps, so Back returns to the previous page or filter.
  function changeFilter(next: UsersFilter): void {
    void navigate({ search: searchForUsersFilter(next), replace: isTyping(filter, next) })
  }

  return (
    <div
      data-wide-page
      className="@container mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-6"
    >
      <PageHeader
        title="Usuários"
        actions={
          <Button
            variant="outline"
            disabled={exporting.isPending}
            aria-busy={exporting.isPending}
            title="Baixa em CSV todos os usuários desta busca e situação, não só os desta página"
            onClick={() =>
              exporting.mutate({ email: filter.search, status: filter.status, order: filter.order })
            }
          >
            <DownloadMinimalistic />
            Exportar CSV
          </Button>
        }
      />
      <ErrorAlert error={exporting.error} />
      <UsersBrowser
        key={projectId}
        projectId={projectId}
        filter={filter}
        onFilterChange={changeFilter}
      />
    </div>
  )
}

/** Only the search text changed: the person is still typing in the field. */
function isTyping(current: UsersFilter, next: UsersFilter): boolean {
  return (
    current.status === next.status &&
    current.order === next.order &&
    current.cursors.join() === next.cursors.join() &&
    current.search !== next.search
  )
}
