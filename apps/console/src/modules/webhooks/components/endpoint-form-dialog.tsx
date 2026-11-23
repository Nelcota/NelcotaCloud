import type { JSX } from 'react'
import { useState } from 'react'

import { EndpointNameField } from '@/modules/webhooks/components/endpoint-name-field'
import { EndpointReview } from '@/modules/webhooks/components/endpoint-review'
import { EndpointUrlField } from '@/modules/webhooks/components/endpoint-url-field'
import { urlProblem } from '@/modules/webhooks/components/endpoint-url-rules'
import { EventTypePicker } from '@/modules/webhooks/components/event-type-picker'
import type { WebhookEventType } from '@/modules/webhooks/components/event-types'
import { withHttps, withoutHttps } from '@/shared/lib/web-address'
import { missingUnless } from '@/shared/lib/missing-unless'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'

/** `description` is the optional name; a blank one removes it. */
export type EndpointFormValues = {
  url: string
  description: string
  event_types: WebhookEventType[]
}

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
  const [name, setName] = useState(props.initial.description)
  const [eventTypes, setEventTypes] = useState(props.initial.event_types)

  async function save(): Promise<void> {
    await props.onSubmit({ url: withHttps(url), description: name.trim(), event_types: eventTypes })
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
          missing: urlProblem(url),
          content: (
            <div className="flex flex-col gap-4">
              <EndpointUrlField value={url} onChange={setUrl} hasAutoFocus />
              <EndpointNameField value={name} onChange={setName} />
            </div>
          ),
        },
        {
          label: 'Eventos',
          missing: missingUnless(eventTypes.length > 0, 'Escolha pelo menos um evento'),
          content: <EventTypePicker selected={eventTypes} onChange={setEventTypes} />,
        },
        {
          label: 'Revisar',
          description: 'Confira antes de salvar.',
          missing: null,
          content: (
            <EndpointReview url={withHttps(url)} name={name.trim()} eventTypes={eventTypes} />
          ),
        },
      ]}
    />
  )
}
