import { useState, type FormEvent, type JSX } from 'react'

import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { EventTypePicker } from '@/modules/webhooks/components/event-type-picker'
import { isSameEventChoice } from '@/modules/webhooks/components/event-types'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

type EndpointEventsTabProps = { projectId: string; endpoint: WebhookEndpoint }

/** The subscribed events as a grouped checklist, saved together. */
export function EndpointEventsTab({ projectId, endpoint }: EndpointEventsTabProps): JSX.Element {
  const [selected, setSelected] = useState(endpoint.event_types)
  const update = useUpdateWebhookEndpointMutation(projectId)
  const isUnchanged = isSameEventChoice(selected, endpoint.event_types)

  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (isUnchanged || selected.length === 0) {
      return
    }

    update.mutate({ endpointId: endpoint.id, body: { event_types: selected } })
  }

  return (
    <SettingsSection
      title="Eventos"
      onSubmit={save}
      footerNote={emptyNote(selected.length)}
      footer={
        <>
          <SavedNote isSaved={update.isSuccess && isUnchanged} message="Eventos salvos" />
          <PendingButton
            type="submit"
            size="sm"
            isPending={update.isPending}
            disabled={isUnchanged || selected.length === 0}
          >
            Salvar eventos
          </PendingButton>
        </>
      }
    >
      <ErrorAlert error={update.error} />
      <EventTypePicker selected={selected} onChange={setSelected} hasMeanings />
    </SettingsSection>
  )
}

function emptyNote(count: number): string | undefined {
  if (count > 0) {
    return undefined
  }

  return 'Escolha pelo menos um evento.'
}
