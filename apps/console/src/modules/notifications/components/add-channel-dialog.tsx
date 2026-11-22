import { Plus } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { EventsField } from '@/modules/notifications/components/events-field'
import {
  type ChannelKind,
  KIND_LABELS,
  NOTIFICATION_EVENTS,
  type NotificationEvent,
  TARGET_FIELDS,
} from '@/modules/notifications/components/notification-events'
import { useCreateChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { SegmentedControl } from '@/shared/ui/segmented-control'
import { TextField } from '@/shared/ui/text-field'

type Draft = { kind: ChannelKind; target: string; events: NotificationEvent[] }

const KINDS: ChannelKind[] = ['email', 'discord', 'slack']

function blankDraft(): Draft {
  return { kind: 'email', target: '', events: NOTIFICATION_EVENTS.map((event) => event.value) }
}

type AddChannelDialogProps = { projectId: string; isDisabled: boolean }

/** Adds an email address or a Discord or Slack webhook, with the alerts it receives. */
export function AddChannelDialog({ projectId, isDisabled }: AddChannelDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const creation = useCreateChannelMutation(projectId)
  const field = TARGET_FIELDS[draft.kind]

  function open(): void {
    setDraft(blankDraft())
    setIsOpen(true)
  }

  async function add(): Promise<void> {
    await creation.mutateAsync({ kind: draft.kind, target: draft.target, events: draft.events })
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={isDisabled} onClick={open}>
        <Plus aria-hidden data-icon="inline-start" />
        Adicionar canal
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Novo canal de notificação"
        description="Os avisos do projeto chegam aqui, no máximo um por evento a cada 6 horas."
        confirmLabel="Adicionar canal"
        canConfirm={draft.target.trim() !== '' && draft.events.length > 0}
        size="lg"
        onConfirm={add}
      >
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="Tipo de canal"
            options={KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] }))}
            value={draft.kind}
            onValueChange={(kind) => setDraft({ ...draft, kind: kindOf(kind), target: '' })}
          />
          <TextField
            label={field.label}
            placeholder={field.placeholder}
            value={draft.target}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setDraft({ ...draft, target: event.target.value })}
          />
          <EventsField
            selected={draft.events}
            onChange={(events) => setDraft({ ...draft, events })}
          />
        </div>
      </ConfirmDialog>
    </>
  )
}

function kindOf(value: string): ChannelKind {
  return KINDS.find((kind) => kind === value) ?? 'email'
}
