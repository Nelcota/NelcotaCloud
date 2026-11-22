import { Check, Copy } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { useClipboard } from '@/shared/lib/use-clipboard'
import { Button } from '@/shared/ui/primitives/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

type CopyButtonProps = {
  value: string
  /** What is copied, for screen readers ("a secret key"). */
  description: string
  /** Shows only the icon, for tight rows and code bars. */
  isIconOnly?: boolean
}

/** Copies a value and says so for a moment; the clipboard can be blocked, so failure is shown too. */
export function CopyButton({ value, description, isIconOnly }: CopyButtonProps): JSX.Element {
  const { copy, isCopied, announcement } = useClipboard({ announce: 'Copiado.' })
  const [hasFailed, setHasFailed] = useState(false)
  const label = labelOf(isCopied, hasFailed)

  async function copyValue(): Promise<void> {
    const isDone = await copy(value)
    setHasFailed(isDone === false)
  }

  return (
    <>
      <span className="sr-only" role="status">
        {announcement || failureText(hasFailed)}
      </span>
      <CopyTrigger
        label={label}
        description={description}
        isIconOnly={isIconOnly === true}
        isCopied={isCopied}
        onCopy={copyValue}
      />
    </>
  )
}

type CopyTriggerProps = {
  label: string
  description: string
  isIconOnly: boolean
  isCopied: boolean
  onCopy: () => Promise<void>
}

function CopyTrigger(props: CopyTriggerProps): JSX.Element {
  const glyph = <CopyGlyph isCopied={props.isCopied} />

  if (props.isIconOnly === false) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => void props.onCopy()}>
        {glyph}
        {props.label}
      </Button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${props.label}: ${props.description}`}
          onClick={() => void props.onCopy()}
        >
          {glyph}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  )
}

function CopyGlyph({ isCopied }: { isCopied: boolean }): JSX.Element {
  if (isCopied) {
    return <Check aria-hidden data-icon="inline-start" className="text-success" />
  }

  return <Copy aria-hidden data-icon="inline-start" />
}

function labelOf(isCopied: boolean, hasFailed: boolean): string {
  if (isCopied) {
    return 'Copiado'
  }

  if (hasFailed) {
    return 'Tentar de novo'
  }

  return 'Copiar'
}

function failureText(hasFailed: boolean): string {
  if (hasFailed) {
    return 'Não foi possível copiar.'
  }

  return ''
}
