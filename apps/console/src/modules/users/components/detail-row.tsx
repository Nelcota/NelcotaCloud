import type { JSX, ReactNode } from 'react'

type DetailRowProps = {
  label: string
  children: ReactNode
  /** What the admin can do about this fact, on the right. */
  action?: ReactNode
}

/**
 * One fact about a user inside a `<dl>`: a small muted label over its value, with its action on
 * the right. Compact (12px by 16px), so a side panel of facts reads as one list, not a stack of boxes.
 */
export function DetailRow({ label, children, action }: DetailRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium">{children}</dd>
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
