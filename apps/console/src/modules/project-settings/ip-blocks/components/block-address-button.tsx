import Shield from '~icons/solar/shield-cross-linear'
import type { JSX } from 'react'

import { useBlockAddressMutation } from '@/modules/project-settings/ip-blocks/queries/use-blocked-addresses'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type BlockAddressButtonProps = {
  projectId: string
  address: string
  size?: 'sm' | 'default'
}

/** Blocks one address from the activity log, asking first: its logins stop at once. */
export function BlockAddressButton({
  projectId,
  address,
  size,
}: BlockAddressButtonProps): JSX.Element {
  const block = useBlockAddressMutation(projectId)

  async function confirm(): Promise<void> {
    await block.mutateAsync({ address, note: 'Bloqueado pela atividade' })
  }

  return (
    <ConfirmButton
      title={`Bloquear o IP ${address}?`}
      description="Logins, cadastros e links por e-mail vindos dele são recusados até você desbloquear em Configurações."
      confirmLabel="Bloquear IP"
      isDestructive
      isPending={block.isPending}
      change={{ subject: address, icon: Shield, from: 'Liberado', to: 'Bloqueado' }}
      size={size}
      onConfirm={confirm}
    >
      Bloquear IP
    </ConfirmButton>
  )
}
