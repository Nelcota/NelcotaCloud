import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { EventTypePicker } from '@/modules/webhooks/components/event-type-picker'
import type { WebhookEventType } from '@/modules/webhooks/components/event-types'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import type { IconComponent } from '@/shared/ui/icon-component'

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
  isPending: boolean
}

/** Where the endpoint lives and which events it receives: the same form to create and edit. */
export function EndpointFormDialog(props: EndpointFormDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState(props.initial.url)
  const [eventTypes, setEventTypes] = useState(props.initial.event_types)
  const [submitError, setSubmitError] = useState<Error | null>(null)

  function open(): void {
    setUrl(props.initial.url)
    setEventTypes(props.initial.event_types)
    setSubmitError(null)
    setIsOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    setSubmitError(null)

    try {
      await props.onSubmit({ url: url.trim(), event_types: eventTypes })
      setIsOpen(false)
    } catch (caught) {
      setSubmitError(asError(caught))
    }
  }

  return (
    <>
      <TriggerButton trigger={props.trigger} onOpen={open} />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={submit} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>{props.title}</DialogTitle>
              <DialogDescription>
                Recebe um POST assinado a cada evento escolhido. Responda 2xx em até 10 segundos.
              </DialogDescription>
            </DialogHeader>
            <FormField
              label="URL"
              type="url"
              required
              autoComplete="off"
              placeholder="https://api.seuapp.com/webhooks/nelcota"
              hint="HTTPS, em um endereço público."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <EventTypePicker selected={eventTypes} onChange={setEventTypes} />
            <ErrorAlert error={submitError} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={eventTypes.length === 0 || props.isPending}
                aria-busy={props.isPending}
              >
                {props.submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TriggerButton({
  trigger,
  onOpen,
}: {
  trigger: DialogTrigger
  onOpen: () => void
}): JSX.Element {
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

function asError(caught: unknown): Error {
  if (caught instanceof Error) {
    return caught
  }

  return new Error('Não foi possível salvar o endpoint.')
}
