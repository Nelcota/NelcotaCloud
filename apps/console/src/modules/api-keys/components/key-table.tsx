import type { JSX } from 'react'

import { activeKeys, countActive } from '@/modules/api-keys/components/key-activity'
import type { KeyRevocation } from '@/modules/api-keys/components/key-revocation'
import { KeyTableRow } from '@/modules/api-keys/components/key-table-row'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'
import { Section } from '@/shared/ui/section'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** Fixed widths, so the publishable and secret tables line up column by column. */
const COLUMNS = [
  { label: 'Nome', width: 'w-[22%]' },
  { label: 'Chave', width: 'w-[30%]' },
  { label: 'ID', width: 'w-36' },
  { label: 'Criada', width: 'w-28' },
  { label: 'Último uso', width: 'w-36' },
  { label: 'Status', width: 'w-24' },
]

type KeyTableProps = {
  title: string
  description: string
  kind: 'publishable' | 'secret'
  keys: ApiKeySummary[]
  revocation: KeyRevocation
  /** Said under the rows, such as why a key cannot be revoked. */
  footer?: JSX.Element | null
}

/** The working keys of one kind as a framed table. */
export function KeyTable(props: KeyTableProps): JSX.Element {
  const rows = activeKeys(props.keys).filter((key) => key.kind === props.kind)
  const activeCount = countActive(props.keys, props.kind)

  return (
    <Section title={props.title} description={props.description} meta={rows.length} isFramed>
      <KeyRows rows={rows} activeCount={activeCount} revocation={props.revocation} />
      {props.footer}
    </Section>
  )
}

type KeyRowsProps = { rows: ApiKeySummary[]; activeCount: number; revocation: KeyRevocation }

function KeyRows({ rows, activeCount, revocation }: KeyRowsProps): JSX.Element {
  if (rows.length === 0) {
    return <EmptyState title="Nenhuma chave ativa deste tipo." isCompact />
  }

  return (
    <Table className="min-w-[52rem] table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((column) => (
            <TableHead key={column.label} className={column.width}>
              {column.label}
            </TableHead>
          ))}
          <TableHead className="w-14">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((apiKey) => (
          <KeyTableRow
            key={apiKey.id}
            apiKey={apiKey}
            activeCount={activeCount}
            revocation={revocation}
          />
        ))}
      </TableBody>
    </Table>
  )
}
