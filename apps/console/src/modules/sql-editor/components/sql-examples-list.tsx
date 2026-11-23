import { SquareCode } from 'lucide-react'
import type { JSX } from 'react'

import { SQL_EXAMPLES } from '@/modules/sql-editor/components/sql-examples'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'

type SqlExamplesListProps = {
  /** Puts the example in the box; it never runs by itself. */
  onPick: (sql: string) => void
}

/** While the box is empty: one sentence and the ready statements that fill it. */
export function SqlExamplesList({ onPick }: SqlExamplesListProps): JSX.Element {
  return (
    <EmptyState
      icon={<SquareCode aria-hidden />}
      isCompact
      title="Escreva uma consulta ou comece por um exemplo"
      actions={SQL_EXAMPLES.map((example) => (
        <Button
          key={example.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPick(example.sql)}
        >
          {example.label}
        </Button>
      ))}
    />
  )
}
