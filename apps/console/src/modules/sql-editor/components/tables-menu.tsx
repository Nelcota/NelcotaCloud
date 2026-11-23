import { ChevronDown, Table } from 'lucide-react'
import { type JSX, useState } from 'react'

import { SchemaTablesPanel } from '@/modules/sql-editor/components/schema-tables-panel'
import { tableQuery } from '@/modules/sql-editor/components/table-query'
import { Button } from '@/shared/ui/primitives/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/primitives/popover'

type TablesMenuProps = {
  projectId: string
  /** Puts a query for the picked table in the box; it never runs by itself. */
  onPick: (sql: string) => void
}

/** The project's tables behind one button, with a search and their size. */
export function TablesMenu({ projectId, onPick }: TablesMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  function pick(table: string): void {
    setIsOpen(false)
    onPick(tableQuery(table))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Table aria-hidden data-icon="inline-start" />
          Tabelas
          <ChevronDown aria-hidden data-icon="inline-end" className="size-4.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <SchemaTablesPanel projectId={projectId} onPick={pick} />
      </PopoverContent>
    </Popover>
  )
}
