import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ConfigureProviderDialog } from '@/modules/project-settings/components/configure-provider-dialog'
import { ProviderMenu } from '@/modules/project-settings/components/provider-menu'
import type { components } from '@/shared/api/api-schema'

type ProviderActionsProps = {
  projectId: string
  provider: OAuthProviderName
  callbackUrl: string
  configured: components['schemas']['ConfiguredProvider'] | null
}

/** One action per row: set the provider up, or change its app with turning it off in the menu. */
export function ProviderActions({
  projectId,
  provider,
  callbackUrl,
  configured,
}: ProviderActionsProps): JSX.Element {
  if (configured === null) {
    return (
      <ConfigureProviderDialog
        projectId={projectId}
        provider={provider}
        callbackUrl={callbackUrl}
        triggerLabel="Configurar"
      />
    )
  }

  return (
    <>
      <ConfigureProviderDialog
        projectId={projectId}
        provider={provider}
        callbackUrl={callbackUrl}
        triggerLabel="Trocar credenciais"
      />
      <ProviderMenu projectId={projectId} provider={provider} />
    </>
  )
}
