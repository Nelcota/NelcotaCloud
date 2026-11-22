import type { JSX, ReactNode } from 'react'

import type { AddressActions } from '@/modules/activity/components/audit-event-sheet'
import { actorText } from '@/modules/activity/components/audit-event-text'
import { AuditEventUser } from '@/modules/activity/components/audit-event-user'
import { METHOD_LABELS } from '@/modules/activity/components/audit-labels'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import type { components } from '@/shared/api/api-schema'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { IdChip } from '@/shared/ui/id-chip'
import { InlineCode } from '@/shared/ui/inline-code'
import { Button } from '@/shared/ui/primitives/button'

type AuditEvent = components['schemas']['AuditEvent']

type AuditEventFactsProps = {
  event: AuditEvent
  context: AuditRowContext
  actions: AddressActions
}

/** Every field of the event as label and value rows; the ones it does not have are left out. */
export function AuditEventFacts({ event, context, actions }: AuditEventFactsProps): JSX.Element {
  const method = event.login_method ?? null

  return (
    <DataList>
      <DataListItem label="Ação">
        <InlineCode>{event.action}</InlineCode>
        <span className="text-muted-foreground tabular-nums"> · evento #{event.id}</span>
      </DataListItem>
      <OptionalItem label="Usuário" value={event.email}>
        <AuditEventUser event={event} projectId={context.projectId} />
      </OptionalItem>
      <OptionalItem label="ID do usuário" value={event.user_id}>
        <IdChip label="ID do usuário" value={event.user_id ?? ''} />
      </OptionalItem>
      <DataListItem label="Origem">{actorText(event, context.memberEmails)}</DataListItem>
      <OptionalItem label="Conta do console" value={event.actor_account_id}>
        <IdChip label="ID da conta do console" value={event.actor_account_id ?? ''} />
      </OptionalItem>
      <OptionalItem label="Método de login" value={method}>
        {method !== null && METHOD_LABELS[method]}
      </OptionalItem>
      <OptionalItem label="IP" value={event.ip_address}>
        <AddressFact address={event.ip_address ?? ''} actions={actions} />
      </OptionalItem>
      <OptionalItem label="User agent" value={event.user_agent}>
        <span className="font-mono text-xs">{event.user_agent}</span>
      </OptionalItem>
      <OptionalItem label="ID da requisição" value={event.request_id}>
        <IdChip label="ID da requisição" value={event.request_id ?? ''} />
      </OptionalItem>
    </DataList>
  )
}

type OptionalItemProps = { label: string; value: unknown; children: ReactNode }

function OptionalItem({ label, value, children }: OptionalItemProps): JSX.Element | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return <DataListItem label={label}>{children}</DataListItem>
}

function AddressFact({
  address,
  actions,
}: {
  address: string
  actions: AddressActions
}): JSX.Element {
  const onBlock = actions.onBlock

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="font-mono text-sm tabular-nums">{address}</span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => actions.onFilter(address)}>
          Filtrar por este IP
        </Button>
        {onBlock !== undefined && (
          <Button type="button" variant="outline" size="sm" onClick={() => onBlock(address)}>
            Bloquear IP
          </Button>
        )}
      </div>
    </div>
  )
}
