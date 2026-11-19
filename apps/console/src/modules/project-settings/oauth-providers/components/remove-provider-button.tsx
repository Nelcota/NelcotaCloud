import Login from '~icons/solar/login-3-linear'
import type { JSX } from 'react'

import type { OAuthProvider } from '@nelcota/sdk'
import { ProviderRemoveIllustration } from '@/modules/project-settings/oauth-providers/components/provider-illustrations'
import { PROVIDER_NAMES } from '@/modules/project-settings/oauth-providers/model/provider-names'
import { useRemoveProviderMutation } from '@/modules/project-settings/oauth-providers/queries/use-oauth-providers'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type RemoveProviderButtonProps = {
  projectId: string
  provider: OAuthProvider
}

/** Turns login with one provider off; the dialog shows any error from the API. */
export function RemoveProviderButton({
  projectId,
  provider,
}: RemoveProviderButtonProps): JSX.Element {
  const removal = useRemoveProviderMutation({ projectId, provider })
  const providerName = PROVIDER_NAMES[provider]

  return (
    <ConfirmButton
      title={`Desativar o login com ${providerName}?`}
      description="O botão deixa de funcionar no app e as credenciais são apagadas. Usuários que entravam só por ele precisarão de outro jeito de entrar."
      confirmLabel="Desativar"
      change={{
        subject: `Login com ${providerName}`,
        icon: Login,
        from: 'Ativo',
        to: 'Desativado',
      }}
      illustration={<ProviderRemoveIllustration provider={provider} />}
      isDestructive
      isPending={removal.isPending}
      onConfirm={() => removal.mutateAsync()}
    >
      Desativar
    </ConfirmButton>
  )
}
