import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ConfirmedActionButton } from '@/modules/users/components/confirmed-action-button'
import { useUserActionMutation } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'

type AuditEvent = components['schemas']['AuditEvent']

type EventUserActionsProps = { event: AuditEvent; projectId: string }

/**
 * What an admin usually does after reading a suspicious event: open the account, end its
 * sessions or block it. Only for an event about an account that still exists.
 */
export function EventUserActions({ event, projectId }: EventUserActionsProps): JSX.Element | null {
  const action = useUserActionMutation(projectId)
  const userId = event.user_id ?? null
  const email = event.email ?? null

  if (userId === null || email === null || event.action === 'user_deleted') {
    return null
  }

  async function run(name: 'end-sessions' | 'ban'): Promise<void> {
    await action.mutateAsync({ action: name, userId: userId ?? '', email: email ?? '' })
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Link
          to="/projects/$projectId/users/$userId"
          params={{ projectId, userId }}
          className={buttonVariants({ variant: 'outline' })}
        >
          Abrir usuário
        </Link>
        <ConfirmedActionButton
          action="end-sessions"
          subject={{ email }}
          isPending={action.isPending}
          onConfirm={() => run('end-sessions')}
        />
        <ConfirmedActionButton
          action="ban"
          subject={{ email }}
          isPending={action.isPending}
          onConfirm={() => run('ban')}
        />
      </div>
      <ErrorAlert error={action.error} />
    </div>
  )
}
