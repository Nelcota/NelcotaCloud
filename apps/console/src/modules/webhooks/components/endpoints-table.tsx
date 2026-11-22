import type { JSX } from 'react'

import { ENDPOINT_COLUMN_VISIBILITY as COLUMNS } from '@/modules/webhooks/components/endpoint-columns'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointRow } from '@/modules/webhooks/components/endpoint-row'
import { cn } from '@/shared/lib/utils'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'
import { Section } from '@/shared/ui/section'

type EndpointsTableProps = {
  projectId: string
  endpoints: readonly WebhookEndpoint[]
  /** How many endpoints the project may have. */
  limit: number
}

/** Every receiver of the project as a row; each opens its own page. */
export function EndpointsTable({ projectId, endpoints, limit }: EndpointsTableProps): JSX.Element {
  return (
    <Section title="Endpoints" meta={`${endpoints.length} de ${limit}`} isFramed>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>URL</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className={COLUMNS.events}>Eventos</TableHead>
            <TableHead className={cn('text-end', COLUMNS.strip)}>Entregas recentes</TableHead>
            <TableHead className={cn('text-end', COLUMNS.lastAt)}>Última entrega</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {endpoints.map((endpoint) => (
            <EndpointRow key={endpoint.id} projectId={projectId} endpoint={endpoint} />
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}
