import type { JSX } from 'react'

import { useCancelInvitationMutation } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'

type PendingInvitation = components['schemas']['PendingInvitation']

type PendingInvitationsListProps = {
  projectId: string
  invitations: PendingInvitation[]
  canManage: boolean
}

/** Invitations nobody answered yet; hidden when there are none. */
export function PendingInvitationsList(props: PendingInvitationsListProps): JSX.Element | null {
  const cancellation = useCancelInvitationMutation(props.projectId)

  if (props.invitations.length === 0) {
    return null
  }

  return (
    <SettingsSection
      title="Convites pendentes"
      description="Viram membros quando a pessoa aceita no console."
    >
      <ErrorAlert error={cancellation.error} />
      <ul className="divide-y rounded-lg border">
        {props.invitations.map((invitation) => (
          <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{invitation.email}</p>
              <p className="text-muted-foreground text-xs">
                Enviado em {formatDate(invitation.created_at)}
              </p>
            </div>
            <CancelAction
              email={invitation.email}
              canManage={props.canManage}
              isPending={cancellation.isPending && cancellation.variables === invitation.id}
              onCancel={() => cancellation.mutate(invitation.id)}
            />
          </li>
        ))}
      </ul>
    </SettingsSection>
  )
}

type CancelActionProps = {
  email: string
  canManage: boolean
  isPending: boolean
  onCancel: () => void
}

function CancelAction(props: CancelActionProps): JSX.Element | null {
  if (props.canManage === false) {
    return null
  }

  return (
    <ConfirmButton
      title={`Cancelar o convite de ${props.email}?`}
      description="O link do email deixa de valer. Dá para convidar de novo depois."
      confirmLabel="Cancelar convite"
      isDestructive
      isPending={props.isPending}
      onConfirm={props.onCancel}
    >
      Cancelar
    </ConfirmButton>
  )
}
