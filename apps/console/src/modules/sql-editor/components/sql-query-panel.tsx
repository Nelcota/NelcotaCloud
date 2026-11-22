import type { JSX, KeyboardEvent, ReactNode } from 'react'

import { SqlRunButton } from '@/modules/sql-editor/components/sql-run-button'
import { Textarea } from '@/shared/ui/primitives/textarea'

type SqlQueryPanelProps = {
  query: string
  isRunning: boolean
  /** The outcome of the last run, at the start of the bar under the box. */
  status: ReactNode
  onChange: (query: string) => void
  onRun: () => void
}

/** The SQL box in the code font, with the last run's outcome and the run action under it. */
export function SqlQueryPanel(props: SqlQueryPanelProps): JSX.Element {
  const { query, onRun } = props

  // The keydown of the box bubbles up here, so the shortcut also works from the button.
  function runOnShortcut(event: KeyboardEvent<HTMLElement>): void {
    if (
      event.nativeEvent.isComposing ||
      event.key !== 'Enter' ||
      (event.ctrlKey || event.metaKey) === false
    ) {
      return
    }

    event.preventDefault()
    onRun()
  }

  return (
    <section aria-label="Consulta" className="flex min-w-0 flex-col" onKeyDown={runOnShortcut}>
      <Textarea
        aria-label="Consulta SQL"
        placeholder="select * from …"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        className="field-sizing-fixed h-[clamp(12rem,34vh,32rem)] resize-y rounded-none border-0 bg-surface px-4 py-3 font-mono text-sm leading-6 hover:border-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        value={query}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-y border-border/60 px-3 py-1.5">
        {props.status}
        <SqlRunButton isRunning={props.isRunning} isDisabled={query.trim() === ''} onRun={onRun} />
      </div>
    </section>
  )
}
