import type { JSX, ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  /** Primary actions of the page, aligned right on wide screens and below the title on phones. */
  actions?: ReactNode
}

/** The title every console page starts with, so each one has a single `h1` and the same rhythm. */
export function PageHeader({ title, description, actions }: PageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl text-balance [overflow-wrap:anywhere]">{title}</h1>
        <Description description={description} />
      </div>
      <Actions actions={actions} />
    </header>
  )
}

function Description({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">{description}</p>
}

function Actions({ actions }: { actions?: ReactNode }): JSX.Element | null {
  if (actions === undefined) {
    return null
  }

  return <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
}
