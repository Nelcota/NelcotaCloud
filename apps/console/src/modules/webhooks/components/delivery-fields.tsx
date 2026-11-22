import type { JSX } from 'react'

import { fullDeliveryDate } from '@/modules/webhooks/components/delivery-dates'
import { formatDuration } from '@/modules/webhooks/components/format-duration'
import type { components } from '@/shared/api/api-schema'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { IdChip } from '@/shared/ui/id-chip'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

/** Every field the API reports for a delivery; empty ones are left out. */
export function DeliveryFields({ delivery }: { delivery: DeliveryLogEntry }): JSX.Element {
  return (
    <DataList>
      <DataListItem label="ID da entrega">
        <IdChip label="ID da entrega" value={delivery.id} />
      </DataListItem>
      <DataListItem label="ID do evento (webhook-id)">
        <IdChip label="ID do evento" value={delivery.event_id} />
      </DataListItem>
      <DataListItem label="Resposta">
        <span className="font-mono">{responseText(delivery.last_response_status)}</span>
      </DataListItem>
      <OptionalDuration ms={delivery.last_duration_ms ?? null} />
      <DataListItem label="Tentativas">
        <span className="tabular-nums">{delivery.attempts}</span>
      </DataListItem>
      <DataListItem label="Criada">{fullDeliveryDate(delivery.created_at)}</DataListItem>
      <OptionalDate label="Última tentativa" value={delivery.last_attempt_at} />
      <OptionalDate label="Próxima tentativa" value={delivery.next_attempt_at} />
      <DeliveryError error={delivery.last_error} />
    </DataList>
  )
}

function OptionalDuration({ ms }: { ms: number | null }): JSX.Element | null {
  if (ms === null) {
    return null
  }

  return (
    <DataListItem label="Tempo de resposta">
      <span className="tabular-nums">{formatDuration(ms)}</span>
    </DataListItem>
  )
}

type OptionalDateProps = { label: string; value: string | null | undefined }

function OptionalDate({ label, value }: OptionalDateProps): JSX.Element | null {
  if (value === null || value === undefined) {
    return null
  }

  return <DataListItem label={label}>{fullDeliveryDate(value)}</DataListItem>
}

function DeliveryError({ error }: { error: string | null | undefined }): JSX.Element | null {
  if (error === null || error === undefined || error === '') {
    return null
  }

  return (
    <DataListItem label="Erro">
      <span className="font-mono text-destructive">{error}</span>
    </DataListItem>
  )
}

function responseText(status: number | null | undefined): string {
  if (status === null || status === undefined) {
    return 'Sem resposta'
  }

  return `HTTP ${status}`
}
