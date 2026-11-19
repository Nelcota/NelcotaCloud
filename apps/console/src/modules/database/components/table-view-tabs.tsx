import type { JSX } from 'react'

import type { TableView } from '@/modules/database/components/table-views'
import { FilterPills } from '@/shared/ui/filter-pills'

type TableViewTabsProps = {
  views: readonly { value: TableView; label: string }[]
  value: TableView
  onChange: (value: TableView) => void
}

/** Switches between the table's rows, columns and policies. */
export function TableViewTabs({ views, value, onChange }: TableViewTabsProps): JSX.Element {
  return (
    <FilterPills
      label="O que mostrar da tabela"
      options={views}
      value={value}
      onChange={onChange}
    />
  )
}
