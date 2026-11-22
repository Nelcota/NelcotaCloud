import { Play } from 'lucide-react'
import type { JSX } from 'react'

import { PendingButton } from '@/shared/ui/pending-button'
import { Kbd } from '@/shared/ui/primitives/kbd'

const IS_APPLE = /Mac|iPad|iPhone/u.test(navigator.userAgent)

type SqlRunButtonProps = { isRunning: boolean; isDisabled: boolean; onRun: () => void }

/** The editor's one primary action, with its shortcut in sight ("Executar ⌘↵"). */
export function SqlRunButton({ isRunning, isDisabled, onRun }: SqlRunButtonProps): JSX.Element {
  return (
    <PendingButton
      type="button"
      aria-keyshortcuts="Control+Enter Meta+Enter"
      isPending={isRunning}
      disabled={isDisabled}
      onClick={onRun}
    >
      <Play aria-hidden data-icon="inline-start" />
      Executar
      <Kbd
        aria-hidden
        className="ms-0.5 bg-primary-foreground/15 font-mono text-primary-foreground group-disabled/button:bg-surface-hover group-disabled/button:text-muted-foreground"
      >
        {shortcutLabel()}
      </Kbd>
    </PendingButton>
  )
}

function shortcutLabel(): string {
  if (IS_APPLE) {
    return '⌘↵'
  }

  return 'Ctrl ↵'
}
