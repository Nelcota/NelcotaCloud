import type { components } from '@/shared/api/api-schema'

type PendingInvitation = components['schemas']['PendingInvitation']

export const DELIVERY_LABEL: Record<PendingInvitation['delivery_status'], string> = {
  unknown: 'Envio sem confirmação',
  sending: 'Enviando email',
  sent: 'Email enviado',
  failed: 'Falha no envio',
}

export function invitationDeliveryMessage(invitation: PendingInvitation): string {
  if (invitation.delivery_status === 'sent') {
    return `Email de convite enviado para ${invitation.email}.`
  }

  return `O envio do email para ${invitation.email} falhou. Você pode reenviar pela página da equipe.`
}
