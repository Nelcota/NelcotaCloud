import type { JSX } from 'react'

import { DataGrid } from '@/modules/database/components/data-grid'
import type { components } from '@/shared/api/api-schema'

type SqlResult = components['schemas']['SqlResult']

/** The last result set as a grid; a statement without one has its summary in the status strip. */
export function SqlResultView({ result }: { result: SqlResult }): JSX.Element {
  if (result.columns.length === 0) {
    return <p className="px-4 py-3 text-xs text-muted-foreground">O comando não retornou linhas.</p>
  }

  return (
    <DataGrid
      label="Resultado da consulta"
      columns={result.columns.map((name) => ({ name }))}
      rows={result.rows}
    />
  )
}
