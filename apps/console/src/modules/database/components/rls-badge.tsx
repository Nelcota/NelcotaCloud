import type { JSX } from 'react'

import { isRlsOff } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
import { StatusBadge } from '@/shared/ui/status-badge'

type TableOverview = components['schemas']['TableOverview']

/** Row level security of a plain table; off is a real warning: every request role reaches every row. */
export function RlsBadge({ table }: { table: TableOverview }): JSX.Element | null {
  if (table.rls_enabled) {
    return <StatusBadge tone="success">RLS ativo</StatusBadge>
  }

  if (isRlsOff(table)) {
    return <StatusBadge tone="warning">RLS desligado</StatusBadge>
  }

  return null
}
