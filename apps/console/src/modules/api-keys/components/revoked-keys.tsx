import AltArrowDown from '~icons/solar/alt-arrow-down-linear'
import type { JSX } from 'react'

import {
  DateCell,
  NameCell,
  RelativeDate,
  ValueCell,
} from '@/modules/api-keys/components/key-cells'
import { keyKindOf } from '@/modules/api-keys/components/key-kinds'
import { KeyTable } from '@/modules/api-keys/components/key-table'
import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'
import { SectionRow } from '@/shared/ui/section-row'
import { TableCell, TableRow } from '@/shared/ui/table'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/**
 * Revoked keys as their own section, folded away by default: they no longer work, but stay on
 * record to tell which key an old app or server was still using.
 */
export function RevokedKeys({ keys }: { keys: ApiKeySummary[] }): JSX.Element | null {
  if (keys.length === 0) {
    return null
  }

  return (
    <SectionRow
      title="Chaves revogadas"
      description="Não funcionam mais. Ficam registradas para você saber qual chave um app antigo usava."
    >
      <details className="surface group overflow-hidden">
        <summary className="hover:bg-foreground/[0.035] flex items-center gap-3 px-5 py-4 font-medium transition-colors [&::-webkit-details-marker]:hidden">
          <AltArrowDown
            aria-hidden="true"
            className="text-muted-foreground size-5 -rotate-90 transition-transform group-open:rotate-0 motion-reduce:transition-none"
          />
          {revokedTitle(keys.length)}
        </summary>
        <div className="border-t">
          <KeyTable label="Chaves revogadas" isRevoked>
            {keys.map((key) => (
              <RevokedRow key={key.id} apiKey={key} />
            ))}
          </KeyTable>
        </div>
      </details>
    </SectionRow>
  )
}

function RevokedRow({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  const revokedAt = apiKey.revoked_at ?? apiKey.created_at

  return (
    <TableRow className="text-muted-foreground">
      <NameCell
        apiKey={apiKey}
        tag={<Badge variant="muted">{keyKindOf(apiKey.kind)?.singular ?? apiKey.kind}</Badge>}
        dates={<RelativeDate at={revokedAt} verb="revogada" />}
        canCopy={false}
      />
      <ValueCell apiKey={apiKey} canCopy={false} />
      <DateCell colSpan={2}>
        <RelativeDate at={revokedAt} />
      </DateCell>
      <TableCell />
    </TableRow>
  )
}

function revokedTitle(count: number): string {
  if (count === 1) {
    return 'Mostrar 1 chave revogada'
  }

  return `Mostrar ${count} chaves revogadas`
}
