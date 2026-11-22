import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import { CopyButton } from '@/shared/ui/copy-button'

type CodeBlockProps = {
  code: string
  /** Shown in the bar above the code: a file name or a language. */
  title?: string
  /** What is copied, for screen readers. */
  copyLabel?: string
  maxHeight?: number
  isWrapped?: boolean
  className?: string
}

/** A snippet to read and copy, with a bar that names it. */
export function CodeBlock({
  code,
  title,
  copyLabel,
  maxHeight,
  isWrapped,
  className,
}: CodeBlockProps): JSX.Element {
  return (
    <div className={cn('min-w-0 overflow-hidden rounded-xl bg-surface', className)}>
      <div className="flex h-8 items-center justify-between gap-2 border-b border-border/60 ps-3 pe-1">
        <span className="truncate font-mono text-2xs text-muted-foreground">{title}</span>
        <CopyButton
          value={code}
          description={copyLabel ?? title ?? 'trecho de código'}
          isIconOnly
        />
      </div>
      <pre
        className={cn(
          'scrollbar-thin overflow-auto overscroll-contain p-3.5 font-mono text-xs leading-relaxed',
          isWrapped === true && 'whitespace-pre-wrap wrap-anywhere',
        )}
        style={{ maxHeight }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}
