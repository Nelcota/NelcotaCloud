import AddCircle from '~icons/solar/add-circle-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { EventsField } from '@/modules/notifications/components/events-field'
import {
  CHANNEL_KINDS,
  type ChannelDraft,
  type ChannelKind,
  KIND_LABELS,
  TARGET_FIELDS,
  blankDraft,
  draftMissing,
} from '@/modules/notifications/model/notification-events'
import { useCreateChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { useReadOnlyReason } from '@/shared/auth/write-access'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { FilterPills } from '@/shared/ui/filter-pills'
import { FormField } from '@/shared/ui/form-field'

const KIND_OPTIONS = CHANNEL_KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] }))

type AddChannelDialogProps = { projectId: string; isFull: boolean }

/** Adds an email address or a Discord or Slack webhook, with the alerts it receives. */
export function AddChannelDialog({ projectId, isFull }: AddChannelDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<ChannelDraft>(blankDraft)
  const creation = useCreateChannelMutation(projectId)
  const readOnlyReason = useReadOnlyReason()
  const field = TARGET_FIELDS[draft.kind]

  function open(): void {
    setDraft(blankDraft())
    setIsOpen(true)
  }

  async function add(): Promise<void> {
    await creation.mutateAsync({ ...draft, target: draft.target.trim() })
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={isFull || readOnlyReason !== null}
        title={readOnlyReason ?? undefined}
        onClick={open}
      >
        <AddCircle aria-hidden="true" />
        Adicionar canal
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Novo canal de notificação"
        description="Cada aviso chega no máximo uma vez a cada 6 horas."
        confirmLabel="Adicionar canal"
        canConfirm={draftMissing(draft) === null}
        onConfirm={add}
      >
        <FilterPills
          label="Tipo de canal"
          options={KIND_OPTIONS}
          value={draft.kind}
          onChange={(kind: ChannelKind) => setDraft({ ...draft, kind, target: '' })}
        />
        <FormField
          label={field.label}
          placeholder={field.placeholder}
          type={inputType(draft.kind)}
          required
          autoComplete="off"
          spellCheck={false}
          value={draft.target}
          onChange={(event) => setDraft({ ...draft, target: event.target.value })}
        />
        <EventsField
          selected={draft.events}
          onChange={(events) => setDraft({ ...draft, events })}
        />
      </ConfirmDialog>
    </>
  )
}

function inputType(kind: ChannelKind): 'email' | 'url' {
  if (kind === 'email') {
    return 'email'
  }

  return 'url'
}
