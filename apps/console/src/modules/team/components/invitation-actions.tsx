import Letter from '~icons/solar/letter-linear'
import Trash from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'

import type { InvitationRow } from '@/modules/team/components/team-rows'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type InvitationActionsProps = {
  invitation: InvitationRow
  canManage: boolean
  onCancel: (invitation: InvitationRow) => Promise<void>
  onResend: (invitation: InvitationRow) => Promise<void>
}

/** Members see invitations but cannot resend or cancel them. */
export function InvitationActions({
  invitation,
  canManage,
  onCancel,
  onResend,
}: InvitationActionsProps): JSX.Element | null {
  if (canManage === false) {
    return null
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <ConfirmButton
        label={`Reenviar email para ${invitation.email}`}
        icon={Letter}
        isIconOnly
        isDisabled={invitation.deliveryStatus === 'sending'}
        title="Reenviar email de convite?"
        description={`O convite existente será enviado novamente para ${invitation.email}.`}
        confirmLabel="Reenviar email"
        onConfirm={() => onResend(invitation)}
      />
      <ConfirmButton
        label={`Cancelar convite para ${invitation.email}`}
        icon={Trash}
        isIconOnly
        title={`Cancelar o convite de ${invitation.email}?`}
        description="O link do email deixa de valer. Dá para convidar de novo depois."
        confirmLabel="Cancelar convite"
        cancelLabel="Manter convite"
        change={{ subject: invitation.email, icon: Letter, from: 'Pendente', to: 'Cancelado' }}
        isDestructive
        onConfirm={() => onCancel(invitation)}
      />
    </div>
  )
}
