import type { JSX, ReactNode } from 'react'

import { actorName } from '@/modules/activity/components/audit-actor-name'
import { EventAddress, EventUser } from '@/modules/activity/components/audit-event-parts'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { deviceSummary } from '@/modules/activity/model/device-summary'
import { detailEntries } from '@/modules/activity/model/event-details'
import type { components } from '@/shared/api/api-schema'
import { CopyButton } from '@/shared/ui/copy-button'

type AuditEvent = components['schemas']['AuditEvent']

type EventDetailFieldsProps = { event: AuditEvent; context: AuditRowContext }

/** Who, from where and on what device, the request id and what changed; empty facts are left out. */
export function EventDetailFields({ event, context }: EventDetailFieldsProps): JSX.Element {
  const address = event.ip_address ?? null
  const userAgent = event.user_agent ?? null
  const requestId = event.request_id ?? null

  return (
    <dl className="divide-border grid divide-y">
      <Field label="Usuário" isShown={event.email !== null && event.email !== undefined}>
        <EventUser event={event} context={context} />
      </Field>
      <Field label="Feito por" isShown>
        {actorName(event, context.memberEmails)}
      </Field>
      <Field label="IP" isShown={address !== null}>
        <EventAddress address={address ?? ''} onSearch={context.onSearch} />
      </Field>
      <Field label="Dispositivo" isShown={userAgent !== null}>
        <Device userAgent={userAgent ?? ''} />
      </Field>
      <Field label="Requisição" isShown={requestId !== null}>
        <RequestId requestId={requestId ?? ''} />
      </Field>
      {detailEntries(event.details).map((entry) => (
        <Field key={entry.label} label={entry.label} isShown>
          {entry.value}
        </Field>
      ))}
    </dl>
  )
}

type FieldProps = { label: string; isShown: boolean; children: ReactNode }

function Field({ label, isShown, children }: FieldProps): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return (
    <div className="grid gap-0.5 py-3 first:pt-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

/** The browser and system when recognized, with the raw text below for anything else. */
function Device({ userAgent }: { userAgent: string }): JSX.Element {
  const summary = deviceSummary(userAgent)

  if (summary === null) {
    return <span className="font-mono text-xs font-normal">{userAgent}</span>
  }

  return (
    <span className="grid gap-1">
      {summary}
      <span className="text-muted-foreground font-mono text-xs font-normal">{userAgent}</span>
    </span>
  )
}

/** The id the server sent back in `x-request-id`, to find the request in the server logs. */
function RequestId({ requestId }: { requestId: string }): JSX.Element {
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="font-mono text-xs">{requestId}</span>
      <CopyButton value={requestId} description="ID da requisição" isCompact />
    </span>
  )
}
