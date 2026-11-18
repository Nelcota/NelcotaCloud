import type { JSX } from 'react'

import type { TableView } from '@/modules/database/components/table-views'
import { cn } from '@/shared/lib/class-names'

type TableViewTabsProps = {
  views: readonly { value: TableView; label: string }[]
  value: TableView
  onChange: (value: TableView) => void
}

/** Switches between the table's rows, columns and policies. */
export function TableViewTabs({ views, value, onChange }: TableViewTabsProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="O que mostrar da tabela"
      className="bg-muted/40 flex w-fit rounded-lg border p-0.5"
    >
      {views.map((view) => (
        <button
          key={view.value}
          type="button"
          aria-pressed={view.value === value}
          onClick={() => onChange(view.value)}
          className={cn(
            'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,background-color,transform] outline-none focus-visible:ring-3 active:scale-[0.97] motion-reduce:active:scale-100',
            view.value === value && 'bg-accent text-foreground',
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}
