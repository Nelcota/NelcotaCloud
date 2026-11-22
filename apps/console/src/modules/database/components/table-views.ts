import { isPlainTable } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

export type TableView = 'rows' | 'columns' | 'policies' | 'settings'

export type TableViewOption = { value: TableView; label: string; count: number | null }

const VIEW_LABELS: Record<TableView, string> = {
  rows: 'Dados',
  columns: 'Colunas',
  policies: 'Políticas',
  settings: 'Configurações',
}

/** Views and other kinds have no policies to manage and cannot be dropped here. */
export function viewsOf(table: TableOverview): TableViewOption[] {
  const views: TableView[] = ['rows', 'columns']

  if (isPlainTable(table)) {
    views.push('policies', 'settings')
  }

  return views.map((value) => ({ value, label: VIEW_LABELS[value], count: countOf(table, value) }))
}

/** Columns and policies show how many there are next to the tab's name. */
function countOf(table: TableOverview, view: TableView): number | null {
  if (view === 'columns') {
    return table.columns.length
  }

  if (view === 'policies') {
    return table.policies.length
  }

  return null
}

export function isTableView(value: string): value is TableView {
  return value in VIEW_LABELS
}
