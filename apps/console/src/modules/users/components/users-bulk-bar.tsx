import Close from '~icons/solar/close-circle-linear'
import type { JSX } from 'react'

import { BulkActionButton } from '@/modules/users/components/bulk-action-button'
import { bulkDoneOf } from '@/modules/users/components/bulk-action-confirmations'
import { type AccountState, accountStateOf } from '@/modules/users/model/account-state'
import {
  type BulkAction,
  BulkActionError,
  useBulkUserActionMutation,
} from '@/modules/users/queries/use-bulk-user-action'
import type { components } from '@/shared/api/api-schema'
import { describeError } from '@/shared/api/describe-error'
import { showFlash } from '@/shared/lib/flash-notice'
import { Button } from '@/shared/ui/button'

type User = components['schemas']['User']

type UsersBulkBarProps = {
  projectId: string
  selectedUsers: readonly User[]
  /** After a run: the users that failed stay selected, to retry them. */
  onSettled: (failedIds: readonly string[]) => void
  onClear: () => void
}

/**
 * The actions for the picked users, laid over the toolbar's slot (see `UsersToolbar`). Each one
 * applies to the picked users it fits (resend to the unconfirmed, unblock to the blocked, block
 * to the others) and is left out when it fits no one.
 */
export function UsersBulkBar(props: UsersBulkBarProps): JSX.Element | null {
  const { selectedUsers } = props
  const bulk = useBulkUserActionMutation(props.projectId)

  if (selectedUsers.length === 0) {
    return null
  }

  const byState = (state: AccountState): readonly User[] =>
    selectedUsers.filter((user) => accountStateOf(user) === state)
  const unblocked = selectedUsers.filter((user) => accountStateOf(user) !== 'banned')
  const buttonProps = { isPending: bulk.isPending, run }

  async function run(action: BulkAction, users: readonly User[]): Promise<void> {
    const userIds = users.map((user) => user.id)

    try {
      await bulk.mutateAsync({ action, userIds })
    } catch (failure) {
      throw failureFor(failure, userIds.length, props.onSettled)
    }

    props.onSettled([])
    showFlash(bulkDoneOf(action, userIds.length))
  }

  return (
    // Below `@xl` the slot is two rows tall: the count on top, the actions in a scrollable row
    // under it, each keeping its words; from `@xl` they share one line.
    <div
      role="region"
      aria-label="Ações para os usuários selecionados"
      className="bg-popover ring-foreground/10 absolute inset-0 grid content-center gap-2 rounded-2xl px-3 ring-1 @xl:flex @xl:items-center @xl:gap-3 @xl:px-4"
    >
      <p
        className="shrink-0 text-sm font-medium whitespace-nowrap tabular-nums @xl:mr-auto"
        role="status"
      >
        {selectedLabel(selectedUsers.length)}
      </p>
      <div className="-mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
        <BulkActionButton
          action="resend-verification"
          users={byState('unverified')}
          {...buttonProps}
        />
        <BulkActionButton action="unban" users={byState('banned')} {...buttonProps} />
        <BulkActionButton action="end-sessions" users={selectedUsers} {...buttonProps} />
        <BulkActionButton action="ban" users={unblocked} {...buttonProps} />
        <BulkActionButton action="delete" users={selectedUsers} {...buttonProps} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Limpar seleção"
          title="Limpar seleção (Esc)"
          disabled={bulk.isPending}
          onClick={props.onClear}
        >
          <Close />
        </Button>
      </div>
    </div>
  )
}

function selectedLabel(count: number): string {
  if (count === 1) {
    return '1 selecionado'
  }

  return `${count.toLocaleString('pt-BR')} selecionados`
}

type OnSettled = (failedIds: readonly string[]) => void

/** Keeps the failed users selected and says, in the dialog, how many failed and why. */
function failureFor(failure: unknown, total: number, onSettled: OnSettled): Error {
  if (failure instanceof BulkActionError === false) {
    return new Error(describeError(failure))
  }

  onSettled(failure.failedIds)
  const failed = failure.failedIds.length

  return new Error(
    `${failed} de ${total} falharam e continuam selecionados. ${describeError(failure.firstCause)}`,
  )
}
