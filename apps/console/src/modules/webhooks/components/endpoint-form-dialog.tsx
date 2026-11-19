import type { JSX } from 'react'
import { useState } from 'react'

import { EventTypePicker } from '@/modules/webhooks/components/event-type-picker'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type WebhookEventType,
} from '@/modules/webhooks/components/event-types'
import { WebhookFlowIllustration } from '@/modules/webhooks/components/webhook-illustrations'
import { isWebAddress, withHttps, withoutHttps } from '@/shared/lib/web-address'
import { Button } from '@/shared/ui/button'
import type { IconComponent } from '@/shared/ui/icon-component'
import { ReviewList } from '@/shared/ui/review-list'
import { missingUnless } from '@/shared/ui/step-dialog/missing-unless'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'
import { UrlField } from '@/shared/ui/url-field'

export type EndpointFormValues = { url: string; event_types: WebhookEventType[] }

/** The button that opens the dialog. */
export type DialogTrigger = {
  label: string
  icon: IconComponent
  variant: 'default' | 'outline'
  size: 'default' | 'sm'
  isDisabled: boolean
}

type EndpointFormDialogProps = {
  trigger: DialogTrigger
  title: string
  submitLabel: string
  initial: EndpointFormValues
  /** Resolves once saved; the dialog stays open, with the error, when it fails. */
  onSubmit: (values: EndpointFormValues) => Promise<unknown>
}

/** Where the endpoint lives, which events it receives, then a review: to create and edit. */
export function EndpointFormDialog(props: EndpointFormDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState(withoutHttps(props.initial.url))
  const [eventTypes, setEventTypes] = useState(props.initial.event_types)

  function open(): void {
    setUrl(withoutHttps(props.initial.url))
    setEventTypes(props.initial.event_types)
    setIsOpen(true)
  }

  async function save(): Promise<void> {
    await props.onSubmit({ url: withHttps(url), event_types: eventTypes })
  }

  return (
    <>
      <TriggerButton trigger={props.trigger} onOpen={open} />
      <StepDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={props.title}
        description="Quando algo acontece com um usuário, o seu servidor recebe um aviso assinado."
        finishLabel={props.submitLabel}
        onFinish={save}
        summary={[
          { label: 'Endereço', value: withHttps(url) },
          { label: 'Eventos', value: eventNames(eventTypes) },
        ]}
        steps={[
          {
            label: 'Endereço',
            description: 'Para onde a Nelcota envia os eventos.',
            missing: missingUnless(isWebAddress(url), 'Digite o endereço do seu servidor'),
            illustration: <WebhookFlowIllustration />,
            content: (
              <UrlField
                label="URL do seu servidor"
                placeholder="api.seuapp.com/webhooks/nelcota"
                hint="Um endereço público. Responda com status 2xx em até 10 segundos."
                required
                autoFocus
                value={url}
                onChange={setUrl}
              />
            ),
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
            illustration: <WebhookFlowIllustration />,
            content: <EndpointReview url={withHttps(url)} eventTypes={eventTypes} />,
          },
        ]}
      />
    </>
  )
}

type EndpointReviewProps = { url: string; eventTypes: WebhookEventType[] }

function EndpointReview({ url, eventTypes }: EndpointReviewProps): JSX.Element {
  return (
    <ReviewList
      items={[
        { label: 'URL', value: <code className="font-mono break-all">{url}</code> },
        {
          label: 'Eventos',
          value: eventNames(eventTypes),
        },
      ]}
    />
  )
}

/** The chosen events by name, in the order the form lists them. */
function eventNames(eventTypes: WebhookEventType[]): string {
  return EVENT_TYPES.filter((eventType) => eventTypes.includes(eventType))
    .map((eventType) => EVENT_TYPE_LABELS[eventType])
    .join(', ')
}

type TriggerButtonProps = { trigger: DialogTrigger; onOpen: () => void }

function TriggerButton({ trigger, onOpen }: TriggerButtonProps): JSX.Element {
  const Icon = trigger.icon

  return (
    <Button
      variant={trigger.variant}
      size={trigger.size}
      disabled={trigger.isDisabled}
      onClick={onOpen}
    >
      <Icon />
      {trigger.label}
    </Button>
  )
}
