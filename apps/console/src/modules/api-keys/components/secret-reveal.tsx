import type { JSX } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'

type SecretRevealProps = {
  label: string
  value: string
}

/** A key shown once, with a copy button; the API never returns it again. */
export function SecretReveal({ label, value }: SecretRevealProps): JSX.Element {
  const [isCopied, setIsCopied] = useState(false)

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(value)
    setIsCopied(true)
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <code className="bg-muted flex-1 truncate rounded-md px-2 py-1.5 font-mono text-xs">
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <CopyLabel isCopied={isCopied} />
        </Button>
      </div>
    </div>
  )
}

function CopyLabel({ isCopied }: { isCopied: boolean }): JSX.Element {
  if (isCopied) {
    return <span>Copiado</span>
  }

  return <span>Copiar</span>
}
