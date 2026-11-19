import type { JSX, Ref } from 'react'
import { useDeferredValue, useEffect, useRef } from 'react'

import type { UserSelection } from '@/modules/users/components/use-user-selection'
import { UserStatusPicker } from '@/modules/users/components/user-status-picker'
import { UsersBulkBar } from '@/modules/users/components/users-bulk-bar'
import type { UsersFilter } from '@/modules/users/model/users-search'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { SearchInput } from '@/shared/ui/search-input'
import { useSlashShortcut } from '@/shared/ui/use-slash-shortcut'

type User = components['schemas']['User']

type SearchAndStatus = Pick<UsersFilter, 'search' | 'status'>

type UsersToolbarProps = {
  /** The list's top: paging scrolls it into view. */
  ref: Ref<HTMLDivElement>
  projectId: string
  filter: SearchAndStatus
  onFilterChange: (filter: SearchAndStatus) => void
  selectedUsers: readonly User[]
  selection: UserSelection
}

/**
 * The search and status filter; while users are picked, the bulk actions cover this same slot
 * (and it sticks to the top), so picking a row never moves the rows under the pointer.
 */
export function UsersToolbar(props: UsersToolbarProps): JSX.Element {
  const { ref, projectId, filter, onFilterChange, selectedUsers, selection } = props
  const searchField = useRef<HTMLInputElement>(null)
  // The counts follow the search a beat behind the typing, like the list does.
  const countedSearch = useDeferredValue(filter.search)

  useSlashShortcut(searchField)
  useEscapeToClear(selectedUsers.length, selection.clear)

  return (
    // Sticky here, as a direct child of the page grid, so it has the whole list to stick along.
    <div
      ref={ref}
      className={cn(
        'relative scroll-mt-20 md:scroll-mt-4',
        selectedUsers.length > 0 && 'sticky top-16 z-20 md:top-2',
      )}
    >
      <div
        inert={selectedUsers.length > 0}
        className={cn(
          'flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between',
          selectedUsers.length > 0 && 'invisible',
        )}
      >
        <UserStatusPicker
          projectId={projectId}
          search={countedSearch}
          value={filter.status}
          onChange={(status) => onFilterChange({ ...filter, status })}
        />
        <SearchInput
          ref={searchField}
          label="Buscar por email"
          keyShortcut="/"
          value={filter.search}
          onChange={(search) => onFilterChange({ ...filter, search })}
        />
      </div>
      <UsersBulkBar
        projectId={projectId}
        selectedUsers={selectedUsers}
        onSettled={selection.keepOnly}
        onClear={selection.clear}
      />
    </div>
  )
}

/** Esc drops the selection, unless a dialog or menu is open and takes the key itself. */
function useEscapeToClear(selectedCount: number, clear: () => void): void {
  useEffect(() => {
    if (selectedCount === 0) {
      return undefined
    }

    function clearOnEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented || isLayerOpen()) {
        return
      }

      clear()
    }

    window.addEventListener('keydown', clearOnEscape)

    return () => window.removeEventListener('keydown', clearOnEscape)
  }, [selectedCount, clear])
}

function isLayerOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]') !== null
}
