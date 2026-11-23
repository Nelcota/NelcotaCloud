import type { JSX } from 'react'

import { isPlainTable } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

/**
 * Only what needs a hand: without row level security every request role reaches every row; with
 * it on but no policy the apps reach none. A table without a marker is open as its policies say.
 */
export function RlsMarker({ table }: { table: TableOverview }): JSX.Element | null {
  if (isPlainTable(table) === false) {
    return null
  }

  if (table.rls_enabled === false) {
    return <span className="text-destructive text-xs font-medium">RLS desligado</span>
  }

  if (table.policies.length === 0) {
    return (
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
        RLS sem políticas
      </span>
    )
  }

  return null
}
