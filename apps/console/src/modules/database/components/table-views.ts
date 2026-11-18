import { isPlainTable } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

export type TableView = 'rows' | 'columns' | 'policies'

const VIEW_LABELS: Record<TableView, string> = {
  rows: 'Linhas',
  columns: 'Colunas',
  policies: 'Políticas',
}

/** Views and other kinds have no policies to manage. */
export function viewsOf(table: TableOverview): { value: TableView; label: string }[] {
  const views: TableView[] = ['rows', 'columns']

  if (isPlainTable(table)) {
    views.push('policies')
  }

  return views.map((value) => ({ value, label: VIEW_LABELS[value] }))
}
