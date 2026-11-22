import type { JSX } from 'react'

import {
  MAX_ACTIVE_KEYS,
  activeKeys,
  countActive,
} from '@/modules/api-keys/components/key-activity'
import type { KeyRevocation } from '@/modules/api-keys/components/key-revocation'
import { KeyTableRow } from '@/modules/api-keys/components/key-table-row'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'
import { Section } from '@/shared/ui/section'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** Fixed widths, so long keys are cut instead of pushing the other columns away. */
const COLUMNS = [
  { label: 'Nome', width: 'w-[26%]' },
  { label: 'Tipo', width: 'w-24' },
  { label: 'Chave', width: 'w-[30%]' },
  { label: 'Criada', width: 'w-24' },
  { label: 'Último uso', width: 'w-24' },
  { label: 'Status', width: 'w-20' },
]

/** Publishable keys first, then secret ones, each in the API's order. */
const KIND_ORDER = ['publishable', 'secret']

type KeyTableProps = {
  keys: ApiKeySummary[]
  revocation: KeyRevocation
  /** Said under the rows, such as why a key cannot be revoked. */
  footer?: JSX.Element | null
}

/** Every working key of the project in one table, against the per-project limit. */
export function KeyTable({ keys, revocation, footer }: KeyTableProps): JSX.Element {
  const active = activeKeys(keys)

  return (
    <Section
      title="Chaves ativas"
      description="Publicáveis vão no app e respeitam o RLS. Secretas ficam no servidor e ignoram o RLS."
      meta={`${active.length} de ${MAX_ACTIVE_KEYS}`}
      isFramed
    >
      <KeyRows keys={keys} revocation={revocation} />
      {footer}
    </Section>
  )
}

function KeyRows({ keys, revocation }: Omit<KeyTableProps, 'footer'>): JSX.Element {
  const active = activeKeys(keys)
  const rows = KIND_ORDER.flatMap((kind) => active.filter((key) => key.kind === kind))

  if (rows.length === 0) {
    return <EmptyState title="Nenhuma chave ativa." isCompact />
  }

  return (
    <Table className="min-w-[48rem] table-fixed">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column.label} className={column.width}>
              {column.label}
            </TableHead>
          ))}
          <TableHead className="w-12">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((apiKey) => (
          <KeyTableRow
            key={apiKey.id}
            apiKey={apiKey}
            activeCount={countActive(keys, apiKey.kind)}
            revocation={revocation}
          />
        ))}
      </TableBody>
    </Table>
  )
}
