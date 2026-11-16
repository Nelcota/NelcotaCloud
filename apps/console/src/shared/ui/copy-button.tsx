import { Check, Copy } from 'lucide-react'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/shared/ui/button'

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
}

/** Copies a value and says so for a moment; the clipboard can be blocked, so failure is shown too. */
export function CopyButton({ value, description }: CopyButtonProps): JSX.Element {
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

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={`${LABELS[state]}: ${description}`}
    >
      <CopyIcon state={state} />
      <span aria-live="polite">{LABELS[state]}</span>
    </Button>
  )
}

function CopyIcon({ state }: { state: CopyState }): JSX.Element {
  if (state === 'copied') {
    return <Check className="text-emerald-500" strokeWidth={2} />
  }

  return <Copy strokeWidth={1.75} />
}
