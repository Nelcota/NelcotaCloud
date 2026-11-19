import type { JSX } from 'react'

import { DataGrid } from '@/modules/database/components/data-grid'
import type { components } from '@/shared/api/api-schema'

type SqlResult = components['schemas']['SqlResult']

/** The last result set as a grid, or what a statement without one changed. */
export function SqlResultView({ result }: { result: SqlResult | undefined }): JSX.Element | null {
  if (result === undefined) {
    return null
  }

  if (result.columns.length === 0) {
    return <p className="text-muted-foreground text-sm">{affectedText(result.rows_affected)}</p>
  }

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        {countText(result.row_count, 'linha', 'linhas')}
        <TruncatedNote result={result} />
      </p>
      <DataGrid
        label="Resultado"
        columns={result.columns.map((name) => ({ name }))}
        rows={result.rows}
      />
    </div>
  )
}

function TruncatedNote({ result }: { result: SqlResult }): JSX.Element | null {
  if (result.is_truncated === false) {
    return null
  }

  return <>; mostrando as primeiras {result.rows.length.toLocaleString('pt-BR')}</>
}

function affectedText(rowsAffected: number): string {
  if (rowsAffected === 0) {
    return 'Executado.'
  }

  return `Executado: ${countText(rowsAffected, 'linha afetada', 'linhas afetadas')}.`
}

function countText(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `1 ${singular}`
  }

  return `${count.toLocaleString('pt-BR')} ${plural}`
}
