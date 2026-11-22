import { Play } from 'lucide-react'
import type { JSX } from 'react'

import { PendingButton } from '@/shared/ui/pending-button'
import { Kbd } from '@/shared/ui/primitives/kbd'

const IS_APPLE = /Mac|iPad|iPhone/u.test(navigator.userAgent)

type SqlRunButtonProps = {
  isRunning: boolean
  isDisabled: boolean
  /** Text is selected in the editor: only the selection runs. */
  hasSelection: boolean
  onRun: () => void
}

/** The editor's one primary action, with its shortcut in sight ("Executar ⌘↵"). */
export function SqlRunButton(props: SqlRunButtonProps): JSX.Element {
  return (
    <PendingButton
      type="button"
      aria-keyshortcuts="Control+Enter Meta+Enter"
      isPending={props.isRunning}
      disabled={props.isDisabled}
      onClick={props.onRun}
    >
      <Play aria-hidden data-icon="inline-start" />
      {runLabel(props.hasSelection)}
      <Kbd
        aria-hidden
        className="ms-0.5 bg-primary-foreground/15 font-mono text-primary-foreground group-disabled/button:bg-surface-hover group-disabled/button:text-muted-foreground"
      >
        {shortcutLabel()}
      </Kbd>
    </PendingButton>
  )
}

function runLabel(hasSelection: boolean): string {
  if (hasSelection) {
    return 'Executar seleção'
  }

  return 'Executar'
}

function shortcutLabel(): string {
  if (IS_APPLE) {
    return '⌘↵'
  }

  return 'Ctrl ↵'
}
