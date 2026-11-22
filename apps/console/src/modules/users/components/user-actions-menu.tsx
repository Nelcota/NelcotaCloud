import { Ellipsis } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { ActionConfirmation } from '@/modules/users/components/action-confirmation'
import type { ConfirmedAction } from '@/modules/users/components/user-action-confirmations'
import { UserMenuEntries } from '@/modules/users/components/user-menu-entries'
import { userMenuItems } from '@/modules/users/components/user-menu-items'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

type User = components['schemas']['User']

type UserActionsMenuProps = {
  user: User
  isPending: boolean
  onAction: (action: UserAction) => Promise<void>
  /** Actions already shown as their own buttons next to the menu, so the menu leaves them out. */
  excludedActions?: readonly UserAction[]
}

/** Every admin action on a user behind one `…` button, at the end of a row or a header. */
export function UserActionsMenu(props: UserActionsMenuProps): JSX.Element {
  const { user, isPending, onAction } = props
  const [confirming, setConfirming] = useState<ConfirmedAction | null>(null)
  const items = userMenuItems(user, {
    onConfirm: setConfirming,
    onRun: (action) => void onAction(action).catch(shownAbove),
  }).filter((item) => props.excludedActions?.includes(item.action) !== true)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações para ${user.email}`}
            disabled={isPending}
          >
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <UserMenuEntries items={items} />
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionConfirmation
        action={confirming}
        email={user.email}
        onClose={() => setConfirming(null)}
        onConfirm={onAction}
      />
    </>
  )
}

/** Actions without a dialog show their failure above the list or the page, where it is read. */
function shownAbove(): void {
  return undefined
}
