import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'

type SqlLineNumbersProps = { lineCount: number; activeLine: number }

/** The gutter beside the code; it stays in view when the code scrolls sideways. */
export function SqlLineNumbers({ lineCount, activeLine }: SqlLineNumbersProps): JSX.Element {
  const lines = Array.from({ length: lineCount }, (_, index) => index + 1)

  return (
    <div
      aria-hidden
      className="sticky start-0 z-[2] shrink-0 border-e border-border/60 bg-card py-3 ps-4 pe-3 text-end font-mono text-xs leading-6 text-muted-foreground tabular-nums select-none"
    >
      {lines.map((line) => (
        <div
          key={line}
          className={cn(
            'min-w-5 transition-colors duration-200 ease-standard',
            line === activeLine && 'group-focus-within/editor:text-foreground',
          )}
        >
          {line}
        </div>
      ))}
    </div>
  )
}
