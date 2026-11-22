import Play from '~icons/solar/play-linear'
import type { JSX, KeyboardEvent } from 'react'

import { PendingButton } from '@/shared/ui/pending-button'
import { Kbd } from '@/shared/ui/primitives/kbd'
import { Textarea } from '@/shared/ui/primitives/textarea'

type SqlQueryPanelProps = {
  query: string
  isRunning: boolean
  onChange: (query: string) => void
  onRun: () => void
}

/** The editor panel: a tall monospace box with the run action under it. */
export function SqlQueryPanel({
  query,
  isRunning,
  onChange,
  onRun,
}: SqlQueryPanelProps): JSX.Element {
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
    <section
      aria-label="Consulta"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card"
      onKeyDown={runOnShortcut}
    >
      <Textarea
        aria-label="Consulta SQL"
        placeholder="select * from …"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        className="field-sizing-fixed h-[clamp(16rem,42vh,40rem)] resize-y rounded-none border-0 bg-transparent p-5 font-mono text-base leading-relaxed focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset md:text-[0.9375rem] dark:bg-transparent"
        value={query}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex items-center justify-end gap-3 border-t px-3 py-2.5">
        <span aria-hidden className="hidden items-center gap-1 text-muted-foreground sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>Enter</Kbd>
        </span>
        <PendingButton
          type="button"
          aria-keyshortcuts="Control+Enter Meta+Enter"
          isPending={isRunning}
          disabled={query.trim() === ''}
          onClick={onRun}
        >
          <Play aria-hidden data-icon="inline-start" />
          Executar
        </PendingButton>
      </div>
    </section>
  )
}
