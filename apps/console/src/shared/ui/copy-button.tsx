import Check from '~icons/solar/check-linear'
import Copy from '~icons/solar/copy-linear'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Tooltip } from '@/shared/ui/tooltip'

const FEEDBACK_DURATION_MS = 2000

type CopyState = 'idle' | 'copied' | 'failed'

const LABELS: Record<CopyState, string> = {
  idle: 'Copiar',
  copied: 'Copiado',
  failed: 'Não copiou',
}

type CopyButtonProps = {
  value: string
  /** What is copied, for screen readers ("Copiar a secret key"). */
  description: string
  autoFocus?: boolean
  /** Icon only, named by a tooltip: for a copy action sitting right next to the value. */
  isCompact?: boolean
}

/** Copies a value and says so for a moment; the clipboard can be blocked, so failure is shown too. */
export function CopyButton(props: CopyButtonProps): JSX.Element {
  const { value, description, autoFocus } = props
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') {
      return undefined
    }

    const timer = window.setTimeout(() => setState('idle'), FEEDBACK_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [state])

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  if (props.isCompact === true) {
    return (
      <Tooltip label={LABELS[state]} side="top">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          aria-label={`${LABELS[state]}: ${description}`}
        >
          <CopyIcon state={state} />
        </Button>
      </Tooltip>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      autoFocus={autoFocus}
      aria-label={`${LABELS[state]}: ${description}`}
    >
      <CopyIcon state={state} />
      <span aria-live="polite">{LABELS[state]}</span>
    </Button>
  )
}

function CopyIcon({ state }: { state: CopyState }): JSX.Element {
  if (state === 'copied') {
    return <Check className="text-emerald-500" />
  }

  return <Copy />
}
