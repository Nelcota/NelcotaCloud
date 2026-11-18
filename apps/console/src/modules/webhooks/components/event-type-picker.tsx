import Check from '~icons/solar/check-read-linear'
import type { JSX } from 'react'

import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type WebhookEventType,
} from '@/modules/webhooks/components/event-types'
import { cn } from '@/shared/lib/class-names'
import { Button } from '@/shared/ui/button'

type EventTypePickerProps = {
  selected: readonly WebhookEventType[]
  onChange: (selected: WebhookEventType[]) => void
}

/**
 * Which events the endpoint receives, as cards that look like the console's other choices: the
 * name first, the type below it as the API sends it.
 */
export function EventTypePicker({ selected, onChange }: EventTypePickerProps): JSX.Element {
  function toggle(eventType: WebhookEventType, isChecked: boolean): void {
    const others = selected.filter((current) => current !== eventType)

    if (isChecked) {
      onChange([...others, eventType])
      return
    }

    onChange(others)
  }

  return (
    <div className="@container grid gap-3">
      <AllToggle
        isAll={selected.length === EVENT_TYPES.length}
        onChange={(isAll) => onChange(allOrNone(isAll))}
      />
      <fieldset className="grid gap-2 @lg:grid-cols-2">
        <legend className="sr-only">Eventos que o endpoint recebe</legend>
        {EVENT_TYPES.map((eventType) => (
          <EventCard
            key={eventType}
            eventType={eventType}
            isChecked={selected.includes(eventType)}
            onToggle={(isChecked) => toggle(eventType, isChecked)}
          />
        ))}
      </fieldset>
    </div>
  )
}

function allOrNone(isAll: boolean): WebhookEventType[] {
  if (isAll) {
    return [...EVENT_TYPES]
  }

  return []
}

/** One click for "everything", the common choice for a receiver that logs or syncs users. */
function AllToggle({
  isAll,
  onChange,
}: {
  isAll: boolean
  onChange: (isAll: boolean) => void
}): JSX.Element {
  return (
    <div className="flex justify-end">
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange(isAll === false)}>
        <AllToggleLabel isAll={isAll} />
      </Button>
    </div>
  )
}

function AllToggleLabel({ isAll }: { isAll: boolean }): JSX.Element {
  if (isAll) {
    return <>Desmarcar todos</>
  }

  return <>Selecionar todos</>
}

type EventCardProps = {
  eventType: WebhookEventType
  isChecked: boolean
  onToggle: (isChecked: boolean) => void
}

function EventCard({ eventType, isChecked, onToggle }: EventCardProps): JSX.Element {
  return (
    <label
      className={cn(
        'hover:bg-accent/60 has-[:focus-visible]:ring-ring/50 relative flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-3',
        isChecked && 'border-foreground/50 bg-accent/60',
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <CheckBox isChecked={isChecked} />
      <span className="grid min-w-0 gap-0.5">
        <span className="text-sm font-medium">{EVENT_TYPE_LABELS[eventType]}</span>
        <code className="text-muted-foreground truncate font-mono text-xs">{eventType}</code>
      </span>
    </label>
  )
}

function CheckBox({ isChecked }: { isChecked: boolean }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'border-input mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
        isChecked && 'bg-foreground border-foreground text-background',
      )}
    >
      <CheckMark isChecked={isChecked} />
    </span>
  )
}

function CheckMark({ isChecked }: { isChecked: boolean }): JSX.Element | null {
  if (isChecked === false) {
    return null
  }

  return <Check className="size-4" />
}
