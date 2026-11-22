import { Trash2, Plug as PlugCircle } from 'lucide-react'
import type { JSX } from 'react'

import { DELETE_DESCRIPTION } from '@/modules/webhooks/components/endpoint-copy'
import { hostOf } from '@/modules/webhooks/components/endpoint-host'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointUrlForm } from '@/modules/webhooks/components/endpoint-url-form'
import { useDeleteEndpoint } from '@/modules/webhooks/components/use-delete-endpoint'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { SettingsSection } from '@/shared/ui/settings-section'

type EndpointSettingsTabProps = { projectId: string; endpoint: WebhookEndpoint }

/** The address, and deleting the endpoint in a danger panel. */
export function EndpointSettingsTab({
  projectId,
  endpoint,
}: EndpointSettingsTabProps): JSX.Element {
  const deleteEndpoint = useDeleteEndpoint(projectId, endpoint)

  return (
    <>
      <EndpointUrlForm key={endpoint.url} projectId={projectId} endpoint={endpoint} />
      <SettingsSection
        title="Excluir endpoint"
        description={DELETE_DESCRIPTION}
        isDanger
        footer={
          <ConfirmButton
            label="Excluir endpoint"
            icon={Trash2}
            title={`Excluir o endpoint de ${hostOf(endpoint.url)}?`}
            description={DELETE_DESCRIPTION}
            confirmLabel="Excluir endpoint"
            change={{ subject: endpoint.url, icon: PlugCircle, from: 'Recebendo', to: 'Excluído' }}
            isDestructive
            onConfirm={deleteEndpoint}
          />
        }
      />
    </>
  )
}
