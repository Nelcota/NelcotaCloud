import type { JSX, ReactNode } from 'react'

type DetailRowProps = {
  label: string
  children: ReactNode
  /** What the admin can do about this fact, on the right. */
  action?: ReactNode
}

/** One fact about a user (a label and its value) inside a `<dl>`, with its action beside it. */
export function DetailRow({ label, children, action }: DetailRowProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-sm">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
      <RowAction action={action} />
    </div>
  )
}

function RowAction({ action }: { action?: ReactNode }): JSX.Element | null {
  if (action === undefined) {
    return null
  }

  return <div className="shrink-0">{action}</div>
}
