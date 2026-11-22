import { type JSX, type SyntheticEvent, useState } from 'react'

import { SqlLineNumbers } from '@/modules/sql-editor/components/sql-line-numbers'
import { cn } from '@/shared/lib/utils'
import { HighlightedCode } from '@/shared/ui/highlighted-code'

/** The colored copy and the box over it share every metric, so each character lands on its twin. */
const CODE_TEXT = 'm-0 px-4 py-3 font-mono text-sm leading-6 whitespace-pre [tab-size:2]'

/** Line height and top padding of `CODE_TEXT`, in rem, to place the current line's band. */
const LINE_REM = 1.5
const TOP_REM = 0.75

type SqlCodeEditorProps = {
  value: string
  onChange: (value: string) => void
  /** The selected text, empty when nothing is selected. */
  onSelectionChange: (selected: string) => void
}

/**
 * A plain textarea with transparent text over a highlighted copy of the same text, so typing,
 * undo, selection and screen readers stay the browser's own. The box grows with the text and
 * the frame around it scrolls, so the two never drift apart.
 */
export function SqlCodeEditor(props: SqlCodeEditorProps): JSX.Element {
  const { value, onSelectionChange } = props
  const [activeLine, setActiveLine] = useState(1)
  const lineCount = value.split('\n').length

  function track(event: SyntheticEvent<HTMLTextAreaElement>): void {
    const box = event.currentTarget
    const { selectionStart, selectionEnd } = box
    setActiveLine(box.value.slice(0, selectionStart).split('\n').length)
    onSelectionChange(box.value.slice(selectionStart, selectionEnd))
  }

  return (
    <div className="group/editor scrollbar-thin h-[clamp(12rem,32vh,28rem)] min-h-28 resize-y overflow-auto overscroll-contain rounded-[inherit] transition-shadow duration-200 ease-standard has-[textarea:focus-visible]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]">
      <div className="flex min-h-full w-max min-w-full">
        <SqlLineNumbers lineCount={lineCount} activeLine={activeLine} />
        <div className="relative min-w-0 flex-1">
          <div
            aria-hidden
            className="absolute inset-x-0 h-6 bg-surface opacity-0 transition-opacity duration-200 ease-standard group-focus-within/editor:opacity-100"
            style={{ top: `${TOP_REM + (activeLine - 1) * LINE_REM}rem` }}
          />
          <pre aria-hidden className={cn(CODE_TEXT, 'relative pe-8')}>
            <HighlightedCode code={`${value}\n`} language="sql" />
          </pre>
          <textarea
            aria-label="Consulta SQL"
            placeholder="select * from …"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            wrap="off"
            className={cn(
              CODE_TEXT,
              'absolute inset-0 size-full resize-none overflow-hidden border-0 bg-transparent text-transparent caret-brand outline-none selection:bg-brand/25 selection:text-transparent placeholder:text-muted-foreground',
            )}
            value={value}
            onChange={(event) => {
              props.onChange(event.target.value)
              track(event)
            }}
            onSelect={track}
          />
        </div>
      </div>
    </div>
  )
}
