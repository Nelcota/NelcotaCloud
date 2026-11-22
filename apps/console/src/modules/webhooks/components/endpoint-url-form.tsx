import { useState, type FormEvent, type JSX } from 'react'

import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointUrlField } from '@/modules/webhooks/components/endpoint-url-field'
import { urlProblem } from '@/modules/webhooks/components/endpoint-url-rules'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import { withHttps, withoutHttps } from '@/shared/lib/web-address'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { SettingsSection } from '@/shared/ui/settings-section'

type EndpointUrlFormProps = { projectId: string; endpoint: WebhookEndpoint }

/** Moves the endpoint to another address; checked as typed, the API checks it again. */
export function EndpointUrlForm({ projectId, endpoint }: EndpointUrlFormProps): JSX.Element {
  const [url, setUrl] = useState(withoutHttps(endpoint.url))
  const update = useUpdateWebhookEndpointMutation(projectId)
  const isUnchanged = withHttps(url) === endpoint.url

  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (isUnchanged || urlProblem(url) !== null) {
      return
    }

    update.mutate({ endpointId: endpoint.id, body: { url: withHttps(url) } })
  }

  return (
    <SettingsSection
      title="Endereço"
      onSubmit={save}
      footer={
        <PendingButton
          type="submit"
          size="sm"
          isPending={update.isPending}
          disabled={isUnchanged || urlProblem(url) !== null}
        >
          Salvar endereço
        </PendingButton>
      }
    >
      <ErrorAlert error={update.error} />
      <EndpointUrlField value={url} onChange={setUrl} />
    </SettingsSection>
  )
}
