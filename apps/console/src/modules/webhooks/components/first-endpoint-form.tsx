import { useState, type FormEvent, type JSX } from 'react'

import type { EndpointCreator } from '@/modules/webhooks/components/create-endpoint-button'
import { EndpointNameField } from '@/modules/webhooks/components/endpoint-name-field'
import { EndpointUrlField } from '@/modules/webhooks/components/endpoint-url-field'
import { urlProblem } from '@/modules/webhooks/components/endpoint-url-rules'
import { EventTypePicker } from '@/modules/webhooks/components/event-type-picker'
import type { WebhookEventType } from '@/modules/webhooks/components/event-types'
import { withHttps } from '@/shared/lib/web-address'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { SettingsSection } from '@/shared/ui/settings-section'

/** The first endpoint, right on the empty page: address, name and events, then create. */
export function FirstEndpointForm({ creator }: { creator: EndpointCreator }): JSX.Element {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [eventTypes, setEventTypes] = useState<WebhookEventType[]>(['user.created'])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const problem = blockingProblem(url, eventTypes)

  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (problem !== null) {
      return
    }

    setIsSaving(true)
    setError(null)
    await creator
      .onCreate({ url: withHttps(url), description: name.trim(), event_types: eventTypes })
      .catch(setError)
    setIsSaving(false)
  }

  return (
    <SettingsSection
      title="Primeiro endpoint"
      description="Cada evento chega ao seu servidor como um POST assinado, com novas tentativas por até 28 horas."
      onSubmit={(event) => void create(event)}
      footerNote={problem ?? undefined}
      footer={
        <PendingButton
          type="submit"
          size="sm"
          isPending={isSaving}
          disabled={problem !== null || creator.isDisabled}
        >
          Criar endpoint
        </PendingButton>
      }
    >
      <ErrorAlert error={error} />
      <EndpointUrlField value={url} onChange={setUrl} />
      <EndpointNameField value={name} onChange={setName} />
      <EventTypePicker selected={eventTypes} onChange={setEventTypes} hasMeanings />
    </SettingsSection>
  )
}

/** What still keeps the form from being sent, said once in the footer. */
function blockingProblem(url: string, eventTypes: readonly WebhookEventType[]): string | null {
  if (url.trim() === '') {
    return 'Informe a URL do seu servidor.'
  }

  if (eventTypes.length === 0) {
    return 'Escolha pelo menos um evento.'
  }

  return urlProblem(url)
}
