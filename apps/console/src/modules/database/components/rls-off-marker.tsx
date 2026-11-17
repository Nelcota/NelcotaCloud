import type { JSX } from 'react'

import { isPlainTable } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

/** A real warning: without row level security, every request role reaches every row. */
export function RlsOffMarker({ table }: { table: TableOverview }): JSX.Element | null {
  if (isPlainTable(table) === false || table.rls_enabled) {
    return null
  }

  return <span className="text-destructive text-xs font-medium">RLS desligado</span>
}
