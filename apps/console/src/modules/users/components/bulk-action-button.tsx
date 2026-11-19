import Ban from '~icons/solar/forbidden-circle-linear'
import Letter from '~icons/solar/letter-linear'
import LogOut from '~icons/solar/logout-2-linear'
import Trash from '~icons/solar/trash-bin-trash-linear'
import UserCheck from '~icons/solar/user-check-linear'
import type { JSX } from 'react'

import {
  BULK_CONFIRMATIONS,
  type BulkSubject,
  bulkChangeOf,
  bulkDescriptionOf,
  bulkLabelOf,
  bulkTitleOf,
} from '@/modules/users/components/bulk-action-confirmations'
import { UserActionIllustration } from '@/modules/users/components/user-action-illustration'
import { accountStateOf } from '@/modules/users/model/account-state'
import type { BulkAction } from '@/modules/users/queries/use-bulk-user-action'
import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import type { IconComponent } from '@/shared/ui/icon-component'

type User = components['schemas']['User']

const ICONS: Record<BulkAction, IconComponent> = {
  'resend-verification': Letter,
  unban: UserCheck,
  'end-sessions': LogOut,
  ban: Ban,
  delete: Trash,
}

export type BulkActionButtonProps = {
  action: BulkAction
  /** The picked users this action applies to; the button is disabled when none. */
  users: readonly User[]
  isPending: boolean
  run: (action: BulkAction, users: readonly User[]) => Promise<void>
}

/**
 * One bulk action, always in its place in the bar, saying how many picked users it reaches
 * ("Bloquear 2"); it is disabled, not hidden, when it reaches none, so the buttons never move.
 */
export function BulkActionButton(props: BulkActionButtonProps): JSX.Element {
  const { action, users } = props

  const confirmation = BULK_CONFIRMATIONS[action]
  const subject = bulkSubjectOf(users)
  const Icon = ICONS[action]

  return (
    <ConfirmButton
      title={bulkTitleOf(action, users.length)}
      description={bulkDescriptionOf(action, subject)}
      confirmLabel={bulkLabelOf(action, users.length)}
      isDisabled={users.length === 0}
      isDestructive={confirmation.isDestructive}
      change={bulkChangeOf(action, subject)}
      confirmationText={typedCount(action, users.length)}
      illustration={illustrationOf(action)}
      isPending={props.isPending}
      onConfirm={() => props.run(action, users)}
    >
      <Icon />
      {bulkLabelOf(action, users.length)}
      <span className="tabular-nums opacity-70">{users.length.toLocaleString('pt-BR')}</span>
    </ConfirmButton>
  )
}

/** Only actions whose effect reaches others carry a picture (DESIGN.md, Guided Dialogs). */
function illustrationOf(action: BulkAction): JSX.Element | undefined {
  if (action === 'ban' || action === 'end-sessions' || action === 'delete') {
    return <UserActionIllustration action={action} />
  }

  return undefined
}

function bulkSubjectOf(users: readonly User[]): BulkSubject {
  const emails = users.map((user) => user.email)
  const states = new Set(users.map(accountStateOf))
  const [onlyState] = states

  if (states.size !== 1 || onlyState === undefined) {
    return { emails, sharedState: null }
  }

  return { emails, sharedState: onlyState }
}

/** Deleting several accounts cannot be undone, so the admin types how many first. */
function typedCount(action: BulkAction, count: number): string | undefined {
  if (action !== 'delete' || count < 2) {
    return undefined
  }

  return String(count)
}
