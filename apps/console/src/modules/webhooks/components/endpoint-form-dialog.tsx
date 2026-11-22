import type { JSX } from 'react'
import { useState } from 'react'

import { EndpointReview } from '@/modules/webhooks/components/endpoint-review'
import { EndpointUrlField } from '@/modules/webhooks/components/endpoint-url-field'
import { urlProblem } from '@/modules/webhooks/components/endpoint-url-rules'
import { EventTypePicker } from '@/modules/webhooks/components/event-type-picker'
import type { WebhookEventType } from '@/modules/webhooks/components/event-types'
import { withHttps, withoutHttps } from '@/shared/lib/web-address'
import { missingUnless } from '@/shared/ui/step-dialog/missing-unless'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'

export type EndpointFormValues = { url: string; event_types: WebhookEventType[] }

export type EndpointFormDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  submitLabel: string
  initial: EndpointFormValues
  /** Resolves once saved; the dialog stays open, with the error, when it fails. */
  onSubmit: (values: EndpointFormValues) => Promise<unknown>
}

/**
 * Where the endpoint lives, which events it receives, then a review: to create and edit.
 * Mounted only while open, so every opening starts from `initial`.
 */
export function EndpointFormDialog(props: EndpointFormDialogProps): JSX.Element | null {
  if (props.isOpen === false) {
    return null
  }

  return <EndpointForm {...props} />
}

function EndpointForm(props: EndpointFormDialogProps): JSX.Element {
  const [url, setUrl] = useState(withoutHttps(props.initial.url))
  const [eventTypes, setEventTypes] = useState(props.initial.event_types)

  async function save(): Promise<void> {
    await props.onSubmit({ url: withHttps(url), event_types: eventTypes })
  }

  return (
    <StepDialog
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description="Quando algo acontece com um usuário, o seu servidor recebe um aviso assinado."
      finishLabel={props.submitLabel}
      onFinish={save}
      steps={[
        {
          label: 'Endereço',
          description: 'Para onde a NelcotaCloud envia os eventos.',
          missing: urlProblem(url),
          content: <EndpointUrlField value={url} onChange={setUrl} hasAutoFocus />,
        },
        {
          label: 'Eventos',
          description: 'Escolha o que o seu servidor quer saber.',
          missing: missingUnless(eventTypes.length > 0, 'Escolha pelo menos um evento'),
          content: <EventTypePicker selected={eventTypes} onChange={setEventTypes} />,
        },
        {
          label: 'Revisar',
          description: 'Confira antes de salvar.',
          missing: null,
          content: <EndpointReview url={withHttps(url)} eventTypes={eventTypes} />,
        },
      ]}
    />
  )
}
