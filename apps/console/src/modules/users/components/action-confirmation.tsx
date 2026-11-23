import type { JSX } from 'react'

import {
  CONFIRMATIONS,
  type ConfirmedAction,
} from '@/modules/users/components/user-action-confirmations'
import type { UserAction } from '@/modules/users/queries/use-users'
import { useLastPresent } from '@/shared/lib/use-last-present'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type ActionConfirmationProps = {
  action: ConfirmedAction | null
  email: string
  onClose: () => void
  onConfirm: (action: UserAction) => Promise<void>
}

/** The dialog a menu item opens: the same question the detail page's buttons ask. */
export function ActionConfirmation({
  action,
  email,
  onClose,
  onConfirm,
}: ActionConfirmationProps): JSX.Element | null {
  const shown = useLastPresent(action)

  if (shown === null) {
    return null
  }

  const confirmation = CONFIRMATIONS[shown]

  return (
    <ConfirmDialog
      isOpen={action !== null}
      onClose={onClose}
      title={confirmation.title(email)}
      description={confirmation.description}
      confirmLabel={confirmation.confirmLabel}
      isDestructive={confirmation.isDestructive}
      change={confirmation.change(email)}
      onConfirm={() => onConfirm(shown)}
    />
  )
}
