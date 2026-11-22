import type { JSX } from 'react'

import { EVENT_TYPE_MEANINGS } from '@/modules/webhooks/components/event-meanings'
import type { EventGroup } from '@/modules/webhooks/components/event-groups'
import { EVENT_TYPE_LABELS, type WebhookEventType } from '@/modules/webhooks/components/event-types'
import { Button } from '@/shared/ui/primitives/button'
import { FieldLegend, FieldSet } from '@/shared/ui/primitives/field'
import { CheckboxField } from '@/shared/ui/switch-field'

type EventGroupFieldsetProps = {
  group: EventGroup
  /** The group's events that are ticked. */
  selected: readonly WebhookEventType[]
  onChange: (selected: readonly WebhookEventType[]) => void
  hasMeanings: boolean
}

/** One subject's events: the name, the wire type and what it means, with one click for all. */
export function EventGroupFieldset({
  group,
  selected,
  onChange,
  hasMeanings,
}: EventGroupFieldsetProps): JSX.Element {
  const isAll = selected.length === group.eventTypes.length

  function toggle(eventType: WebhookEventType, isChecked: boolean): void {
    const others = selected.filter((value) => value !== eventType)

    if (isChecked) {
      onChange([...others, eventType])
      return
    }

    onChange(others)
  }

  return (
    <FieldSet className="gap-0">
      <div className="flex items-center justify-between gap-3 pb-1.5">
        <FieldLegend variant="label" className="mb-0">
          {group.label}
          <span className="ms-2 font-normal text-muted-foreground tabular-nums">
            {selected.length} de {group.eventTypes.length}
          </span>
        </FieldLegend>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange(allOrNone(group, isAll))}
        >
          {allToggleLabel(isAll)}
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {group.eventTypes.map((eventType) => (
          <CheckboxField
            key={eventType}
            className="px-3 py-2.5"
            label={EVENT_TYPE_LABELS[eventType]}
            hint={<EventHint eventType={eventType} hasMeaning={hasMeanings} />}
            checked={selected.includes(eventType)}
            onCheckedChange={(isChecked) => toggle(eventType, isChecked)}
          />
        ))}
      </div>
    </FieldSet>
  )
}

type EventHintProps = { eventType: WebhookEventType; hasMeaning: boolean }

function EventHint({ eventType, hasMeaning }: EventHintProps): JSX.Element {
  return (
    <span className="grid gap-0.5">
      <code className="font-mono text-xs text-foreground/80">{eventType}</code>
      {hasMeaning && <span>{EVENT_TYPE_MEANINGS[eventType]}</span>}
    </span>
  )
}

function allOrNone(group: EventGroup, isAll: boolean): readonly WebhookEventType[] {
  if (isAll) {
    return []
  }

  return group.eventTypes
}

function allToggleLabel(isAll: boolean): string {
  if (isAll) {
    return 'Desmarcar todos'
  }

  return 'Selecionar todos'
}
