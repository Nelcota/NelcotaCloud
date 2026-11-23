import { List as Rows } from 'lucide-react'
import type { JSX } from 'react'

import { DataGrid } from '@/modules/database/components/data-grid'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'

type SqlResult = components['schemas']['SqlResult']

/** The last result set as a grid; a statement without one says so. */
export function SqlResultView({ result }: { result: SqlResult }): JSX.Element {
  if (result.columns.length === 0) {
    return (
      <EmptyState icon={<Rows aria-hidden />} isCompact title="O comando não retornou linhas" />
    )
  }

  return (
    <DataGrid
      label="Resultado da consulta"
      columns={result.columns.map((name) => ({ name }))}
      rows={result.rows}
    />
  )
}
