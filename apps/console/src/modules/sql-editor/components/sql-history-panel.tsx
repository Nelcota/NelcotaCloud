import type { JSX } from 'react'

import type { SqlHistoryEntry } from '@/modules/sql-editor/components/sql-history'
import { SqlSideSection } from '@/modules/sql-editor/components/sql-side-section'
import { Timestamp } from '@/shared/ui/timestamp'

type SqlHistoryPanelProps = {
  entries: SqlHistoryEntry[]
  /** Puts the query back in the editor; it never runs by itself. */
  onPick: (sql: string) => void
}

/** The last queries run here, newest first; picking one only fills the editor. */
export function SqlHistoryPanel({ entries, onPick }: SqlHistoryPanelProps): JSX.Element {
  return (
    <SqlSideSection title="Histórico" meta={entries.length} isOpenByDefault>
      <HistoryList entries={entries} onPick={onPick} />
    </SqlSideSection>
  )
}

function HistoryList({ entries, onPick }: SqlHistoryPanelProps): JSX.Element {
  if (entries.length === 0) {
    return <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma consulta ainda.</p>
  }

  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li key={entry.ranAt + entry.sql}>
          <button
            type="button"
            title={entry.sql}
            className="grid w-full gap-0.5 rounded-md px-2 py-1.5 text-left transition-transform hover:bg-surface-hover active:scale-[0.98] motion-reduce:active:scale-100"
            onClick={() => onPick(entry.sql)}
          >
            <span className="truncate font-mono text-xs text-foreground">
              {firstLine(entry.sql)}
            </span>
            <span className="text-xs text-muted-foreground">
              <Timestamp value={entry.ranAt} format="relative" />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The first line with text, so a leading comment or blank line does not hide the query. */
function firstLine(sql: string): string {
  return sql.split('\n').find((line) => line.trim() !== '') ?? sql
}
