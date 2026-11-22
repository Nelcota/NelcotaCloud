import { Check, Copy } from 'lucide-react'
import { type JSX, useState } from 'react'

import { useClipboard } from '@/shared/lib/use-clipboard'
import { Button } from '@/shared/ui/primitives/button'

type CopyTextButtonProps = {
  /** `null` while the text loads: the button waits, busy. */
  text: string | null
  label: string
  /** Read by screen readers once copied ("Prompt copiado."). */
  announce: string
  variant?: 'default' | 'outline'
}

/** Copies a long text the page builds (a prompt, the project context) with one click. */
export function CopyTextButton({
  text,
  label,
  announce,
  variant,
}: CopyTextButtonProps): JSX.Element {
  const { copy, isCopied, announcement } = useClipboard({ announce })
  const [hasFailed, setHasFailed] = useState(false)

  async function copyText(): Promise<void> {
    if (text === null) {
      return
    }

    const isDone = await copy(text)
    setHasFailed(isDone === false)
  }

  return (
    <>
      <span className="sr-only" role="status">
        {announcement || failureText(hasFailed)}
      </span>
      <Button
        type="button"
        variant={variant ?? 'default'}
        disabled={text === null}
        aria-busy={text === null}
        className="disabled:cursor-progress"
        onClick={() => void copyText()}
      >
        <Glyph isCopied={isCopied} />
        {labelOf({ label, isCopied, hasFailed })}
      </Button>
    </>
  )
}

function Glyph({ isCopied }: { isCopied: boolean }): JSX.Element {
  if (isCopied) {
    return <Check aria-hidden data-icon="inline-start" />
  }

  return <Copy aria-hidden data-icon="inline-start" />
}

type LabelState = { label: string; isCopied: boolean; hasFailed: boolean }

function labelOf({ label, isCopied, hasFailed }: LabelState): string {
  if (isCopied) {
    return 'Copiado'
  }

  if (hasFailed) {
    return 'Tentar de novo'
  }

  return label
}

function failureText(hasFailed: boolean): string {
  if (hasFailed) {
    return 'Não foi possível copiar.'
  }

  return ''
}
