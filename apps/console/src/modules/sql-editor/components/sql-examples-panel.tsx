import type { JSX } from 'react'

import { SQL_EXAMPLES } from '@/modules/sql-editor/components/sql-examples'
import { SqlSideSection } from '@/modules/sql-editor/components/sql-side-section'

type SqlExamplesPanelProps = {
  /** Replaces the editor's text with the example; it never runs by itself. */
  onPick: (sql: string) => void
}

/** Ready statements beside the editor; picking one replaces the text. */
export function SqlExamplesPanel({ onPick }: SqlExamplesPanelProps): JSX.Element {
  return (
    <SqlSideSection title="Exemplos">
      <ul className="flex flex-col">
        {SQL_EXAMPLES.map((example) => (
          <li key={example.label}>
            <button
              type="button"
              className="w-full truncate rounded-md px-2 py-1.5 text-start text-sm text-muted-foreground transition-[color,background-color,scale] duration-200 ease-standard hover:bg-surface-hover hover:text-foreground"
              onClick={() => onPick(example.sql)}
            >
              {example.label}
            </button>
          </li>
        ))}
      </ul>
    </SqlSideSection>
  )
}
