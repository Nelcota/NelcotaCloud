import type { LucideIcon } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

/** What a list shows when it has nothing yet: what would be here, and how to add the first one. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="bg-secondary flex size-11 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground size-5" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm text-pretty">{description}</p>
      <EmptyAction action={action} />
    </div>
  )
}

function EmptyAction({ action }: { action?: ReactNode }): JSX.Element | null {
  if (action === undefined) {
    return null
  }

  return <div className="mt-5">{action}</div>
}
