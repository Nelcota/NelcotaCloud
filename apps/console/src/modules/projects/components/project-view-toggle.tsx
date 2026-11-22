import { LayoutGrid, Rows3 } from 'lucide-react'
import type { JSX } from 'react'

import type { ProjectView } from '@/modules/projects/components/project-query'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/primitives/toggle-group'

type ProjectViewToggleProps = {
  view: ProjectView
  onViewChange: (view: ProjectView) => void
}

/** Cards to recognize projects at a glance, a table to scan many of them. */
export function ProjectViewToggle({ view, onViewChange }: ProjectViewToggleProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Visualização dos projetos"
      value={view}
      onValueChange={(value) => {
        if (value === 'cards' || value === 'table') {
          onViewChange(value)
        }
      }}
    >
      <ToggleGroupItem value="cards" aria-label="Cartões" title="Cartões">
        <LayoutGrid aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Tabela" title="Tabela">
        <Rows3 aria-hidden />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
