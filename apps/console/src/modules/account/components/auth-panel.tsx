import type { JSX, ReactNode } from 'react'

/** The rounded panel that holds a public page's task on the frame, like the console's own panel. */
export function AuthPanel({ children }: { children: ReactNode }): JSX.Element {
  return <div className="min-w-0 overflow-hidden rounded-2xl bg-background">{children}</div>
}
