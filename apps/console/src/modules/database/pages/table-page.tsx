import { useParams } from '@tanstack/react-router'
import type { JSX } from 'react'

import { TableDetail } from '@/modules/database/components/table-detail'

export function TablePage(): JSX.Element {
  const { projectId, table } = useParams({
    from: '/_authenticated/projects/$projectId/database/$table',
  })

  return <TableDetail projectId={projectId} tableName={table} />
}
