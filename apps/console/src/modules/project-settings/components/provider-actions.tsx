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
  // The same tree in both states: the dialog stays mounted (and keeps focus) when saving it is
  // what turns the provider on and adds the menu.
  return (
    <>
      <ConfigureProviderDialog
        projectId={projectId}
        provider={provider}
        callbackUrl={callbackUrl}
        triggerLabel={triggerLabelOf(configured)}
      />
      <MenuSlot projectId={projectId} provider={provider} configured={configured} />
    </>
  )
}

function triggerLabelOf(configured: ProviderActionsProps['configured']): string {
  if (configured === null) {
    return 'Configurar'
  }

  return 'Trocar credenciais'
}

function MenuSlot({
  projectId,
  provider,
  configured,
}: Omit<ProviderActionsProps, 'callbackUrl'>): JSX.Element | null {
  if (configured === null) {
    return null
  }

  return <ProviderMenu projectId={projectId} provider={provider} />
}
