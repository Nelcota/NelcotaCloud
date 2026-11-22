import { Bell } from 'lucide-react'
import type { JSX } from 'react'

import { useReceivedInvitationsQuery } from '@/modules/projects/queries/use-received-invitations'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { RouterLink } from '@/shared/routing/router-link'
import { LoadError } from '@/shared/ui/load-error'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/primitives/popover'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type ReceivedInvitation = components['schemas']['ReceivedInvitation']

/** The account's pending project invitations; a dot while there is one to answer. */
export function InvitationsBell(): JSX.Element {
  const invitations = useReceivedInvitationsQuery()
  const pending = invitations.data ?? []

  return (
    <Popover>
      <PopoverTrigger
        aria-label={bellLabel(pending.length)}
        className="relative grid size-10 place-items-center rounded-[10px] text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <Bell aria-hidden className="size-[18px]" />
        {pending.length > 0 && (
          <span
            aria-hidden
            className="absolute end-2 top-2 size-2 rounded-full bg-brand ring-2 ring-frame"
          />
        )}
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-80 gap-0 p-0">
        <div className="border-b px-4 py-3 text-sm font-medium">Convites</div>
        <div className="p-2">
          <LoadError error={invitations.error} onRetry={() => void invitations.refetch()} />
          <InvitationList
            invitations={pending}
            isPending={invitations.isPending}
            hasError={invitations.isError}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function InvitationList({
  invitations,
  isPending,
  hasError,
}: {
  invitations: ReceivedInvitation[]
  isPending: boolean
  hasError: boolean
}): JSX.Element | null {
  if (isPending) {
    return <Skeleton className="h-12 w-full" />
  }

  if (hasError) {
    return null
  }

  if (invitations.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
        Nenhum convite pendente.
      </p>
    )
  }

  return (
    <ul className="grid gap-0.5">
      {invitations.map((invitation) => (
        <li key={invitation.id}>
          <RouterLink href="/" className="grid gap-0.5 rounded-md px-2 py-2 hover:bg-surface-hover">
            <span className="truncate text-sm font-medium">{invitation.project_name}</span>
            <span className="text-xs text-muted-foreground">
              Convite de {formatDate(invitation.created_at)}
            </span>
          </RouterLink>
        </li>
      ))}
    </ul>
  )
}

function bellLabel(count: number): string {
  if (count === 0) {
    return 'Convites'
  }

  if (count === 1) {
    return 'Convites, 1 pendente'
  }

  return `Convites, ${count} pendentes`
}
