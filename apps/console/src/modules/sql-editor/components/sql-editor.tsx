import type { JSX } from 'react'

import { HistoryStepButtons } from '@/modules/sql-editor/components/history-step-buttons'
import { SqlApiSheet } from '@/modules/sql-editor/components/sql-api-sheet'
import { SqlCodeEditor } from '@/modules/sql-editor/components/sql-code-editor'
import { SqlResultPanel } from '@/modules/sql-editor/components/sql-result-panel'
import { SqlResultStatus } from '@/modules/sql-editor/components/sql-result-status'
import { SqlRunButton } from '@/modules/sql-editor/components/sql-run-button'
import { TablesMenu } from '@/modules/sql-editor/components/tables-menu'
import { useSqlEditor } from '@/modules/sql-editor/components/use-sql-editor'
import { PageHeader } from '@/shared/ui/page-header'
import { Section } from '@/shared/ui/section'

/**
 * The page's header with the run action, the query and its result, laid out like the other
 * pages; a query runs with the button or Ctrl/Cmd+Enter, only the selection when text is selected.
 */
export function SqlEditor({ projectId }: { projectId: string }): JSX.Element {
  const editor = useSqlEditor(projectId)
  const { query, outcome } = editor

  return (
    <div onKeyDown={editor.runOnShortcut} className="flex flex-col gap-6">
      <PageHeader
        title="Editor SQL"
        description="Roda como nelcota_developer, sem RLS, por até 15 s: pode alterar dados."
        actions={
          <>
            <SqlApiSheet />
            <SqlRunButton
              isRunning={outcome.isRunning}
              isDisabled={query.trim() === ''}
              hasSelection={editor.hasSelection}
              onRun={editor.execute}
            />
          </>
        }
      />
      <Section
        title="Consulta"
        isFramed
        action={
          <div className="flex items-center gap-1">
            <TablesMenu projectId={projectId} onPick={editor.pick} />
            <HistoryStepButtons steps={editor.steps} />
          </div>
        }
      >
        <SqlCodeEditor
          value={query}
          onChange={editor.change}
          onSelectionChange={editor.setSelected}
        />
      </Section>
      <Section title="Resultado" meta={<SqlResultStatus {...outcome} />} isFramed>
        <SqlResultPanel
          {...outcome}
          isQueryEmpty={query.trim() === ''}
          onPickExample={editor.pick}
        />
      </Section>
    </div>
  )
}
