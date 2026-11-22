import type { JSX, ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** A mark before the title, such as the avatar of the user the page is about. */
  leading?: ReactNode
  /** Under the title row: tabs or filters that belong to the whole page. */
  children?: ReactNode
}

/** The top of every page: a compact title, one line of context and the page's primary actions. */
export function PageHeader({
  title,
  description,
  actions,
  leading,
  children,
}: PageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="grid min-w-0 gap-0.5">
            <h1 className="text-xl font-medium wrap-anywhere">{title}</h1>
            <PageDescription description={description} />
          </div>
        </div>
        <PageActions actions={actions} />
      </div>
      {children}
    </header>
  )
}

function PageDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === null || description === undefined) {
    return null
  }

  return <div className="max-w-prose text-sm text-muted-foreground">{description}</div>
}

function PageActions({ actions }: { actions?: ReactNode }): JSX.Element | null {
  if (actions === null || actions === undefined) {
    return null
  }

  return <div className="flex flex-wrap items-center gap-2">{actions}</div>
}
