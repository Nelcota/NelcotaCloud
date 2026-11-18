import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

const KIND_LABELS: Record<string, string> = {
  table: 'Tabela',
  view: 'View',
  materialized_view: 'View materializada',
  foreign_table: 'Tabela externa',
}

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind
}

/** Only plain tables have columns, policies and row level security to manage here. */
export function isPlainTable(table: TableOverview): boolean {
  return table.kind === 'table'
}

/** The planner's estimate, or a dash before the table was ever analyzed. */
export function estimatedRowsLabel(table: TableOverview): string {
  const rows = table.estimated_rows

  if (rows === null || rows === undefined || rows < 0) {
    return '—'
  }

  return rows.toLocaleString('pt-BR')
}
