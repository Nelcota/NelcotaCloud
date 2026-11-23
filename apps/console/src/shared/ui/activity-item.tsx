import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type ActivityItemProps = {
  /** The event in plain words, drawn first ("feat: checkout com Pix", "Login com senha"). */
  title: ReactNode
  /** Short facts in one line, separated by dots: who, which id, when. */
  meta: readonly ReactNode[]
  /** The outcome on the right, usually a `StatusBadge`. */
  status?: ReactNode
  /** Makes the whole row a button, for feeds whose rows open a detail panel. */
  onOpen?: () => void
  className?: string
}

/** One entry of an activity feed: the message in front, metadata in a quiet line, status aside. */
export function ActivityItem({
  title,
  meta,
  status,
  onOpen,
  className,
}: ActivityItemProps): JSX.Element {
  const content = (
    <>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-xs text-foreground">{title}</span>
        <ActivityMeta meta={meta} />
      </span>
      {status}
    </>
  )
  const rowClass = cn(
    'flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-start',
    className,
  )

  if (onOpen === undefined) {
    return <div className={rowClass}>{content}</div>
  }

  return (
    <button type="button" onClick={onOpen} className={cn(rowClass, 'hover:bg-surface')}>
      {content}
    </button>
  )
}

function ActivityMeta({ meta }: { meta: readonly ReactNode[] }): JSX.Element {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      {meta.map((fact, index) => (
        <span key={index} className="inline-flex min-w-0 items-center gap-1.5">
          {index > 0 && <span aria-hidden>·</span>}
          {fact}
        </span>
      ))}
    </span>
  )
}
