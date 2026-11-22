import type { JSX, ReactNode } from 'react'

import { rowDescriptionId } from '@/modules/project-settings/components/row-description-id'
import { cn } from '@/shared/lib/utils'

type SettingsRowProps = {
  title: string
  description?: ReactNode
  /** The control's id: the title becomes its label and the description its description. */
  controlId?: string
  /** The control or status, on the right on wide screens and below on narrow ones. */
  children: ReactNode
  /** A wide control (a text field) gets more room than a switch or a link. */
  isWide?: boolean
}

/** One setting: what it is on the left, its control on the right. */
export function SettingsRow({
  title,
  description,
  controlId,
  children,
  isWide,
}: SettingsRowProps): JSX.Element {
  return (
    <div
      className={cn(
        'grid gap-2 py-3 sm:items-center sm:gap-6',
        isWide === true && 'sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
        isWide !== true && 'sm:grid-cols-[minmax(0,1fr)_auto]',
      )}
    >
      <div className="grid min-w-0 gap-0.5">
        <RowTitle controlId={controlId}>{title}</RowTitle>
        <RowDescription controlId={controlId}>{description}</RowDescription>
      </div>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-2',
          isWide !== true && 'sm:justify-end',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function RowTitle({ controlId, children }: { controlId?: string; children: string }): JSX.Element {
  const className = 'text-sm font-medium text-foreground'

  if (controlId === undefined) {
    return <span className={className}>{children}</span>
  }

  return (
    <label htmlFor={controlId} className={className}>
      {children}
    </label>
  )
}

type RowDescriptionProps = { controlId?: string; children?: ReactNode }

function RowDescription({ controlId, children }: RowDescriptionProps): JSX.Element | null {
  if (children === undefined) {
    return null
  }

  return (
    <p id={descriptionIdOf(controlId)} className="text-xs text-muted-foreground">
      {children}
    </p>
  )
}

function descriptionIdOf(controlId: string | undefined): string | undefined {
  if (controlId === undefined) {
    return undefined
  }

  return rowDescriptionId(controlId)
}
