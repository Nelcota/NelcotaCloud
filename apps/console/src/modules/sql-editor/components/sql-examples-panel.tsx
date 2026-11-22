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
    <SqlSideSection title="Exemplos" isOpenByDefault>
      <ul className="flex flex-col">
        {SQL_EXAMPLES.map((example) => (
          <li key={example.label}>
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-transform hover:bg-surface-hover hover:text-foreground active:scale-[0.98] motion-reduce:active:scale-100"
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
