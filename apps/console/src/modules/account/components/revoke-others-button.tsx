import { Monitor } from 'lucide-react'
import type { JSX } from 'react'

import { useRevokeOtherSessionsMutation } from '@/modules/account/queries/use-sessions'
import { ConfirmButton } from '@/shared/ui/confirm-button'

/** Ends every session of the account except the one in this browser. */
export function RevokeOthersButton(): JSX.Element {
  const revocation = useRevokeOtherSessionsMutation()

  return (
    <ConfirmButton
      label="Sair dos outros dispositivos"
      title="Sair dos outros dispositivos?"
      description="Todas as sessões terminam, menos esta. Quem estiver usando sua conta em outro lugar precisa entrar de novo."
      confirmLabel="Sair dos outros"
      change={{
        subject: 'Outros dispositivos',
        icon: Monitor,
        from: 'Conectados',
        to: 'Desconectados',
      }}
      isDestructive
      isPending={revocation.isPending}
      onConfirm={() => revocation.mutateAsync()}
    />
  )
}
