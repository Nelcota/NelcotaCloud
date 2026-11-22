import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/primitives/empty'

type EmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  isCompact?: boolean
  /** A dashed frame, for an empty list that stands alone on the page. */
  isFramed?: boolean
}

/** What an empty list means and the action that fills it. */
export function EmptyState({
  title,
  description,
  icon,
  actions,
  isCompact,
  isFramed,
}: EmptyStateProps): JSX.Element {
  return (
    <Empty
      className={cn(
        'gap-4',
        isCompact === true && 'p-6 md:p-6',
        isFramed === true && 'border border-dashed border-muted-foreground/30 bg-card/40',
      )}
    >
      <EmptyHeader>
        {icon !== undefined && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description !== undefined && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {actions !== undefined && (
        <EmptyContent className="flex-row flex-wrap justify-center">{actions}</EmptyContent>
      )}
    </Empty>
  )
}
