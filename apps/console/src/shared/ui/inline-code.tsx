import type { JSX, ReactNode } from 'react'

/** A name or value from code inside a sentence. */
export function InlineCode({ children }: { children: ReactNode }): JSX.Element {
  return (
    <code className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-foreground wrap-anywhere">
      {children}
    </code>
  )
}
