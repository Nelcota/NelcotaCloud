import type { JSX, ReactNode } from 'react'

type PageHeaderProps = {
  /** Usually text; an identifier can pass markup that marks where it may break (`wbr`). */
  title: ReactNode
  description?: ReactNode
  /** A mark before the title and its description, such as the avatar of the person the page is about. */
  leading?: ReactNode
  /** Primary actions of the page, aligned right on wide screens and below the title on phones. */
  actions?: ReactNode
}

/** The title every console page starts with, so each one has a single `h1` and the same rhythm. */
export function PageHeader({ title, description, leading, actions }: PageHeaderProps): JSX.Element {
  return (
    <header className={headerClass(leading)}>
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-balance [overflow-wrap:anywhere]">
            {title}
          </h1>
          <Description description={description} />
        </div>
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

/** With a leading mark the title block is taller, so the actions centre on it instead of its baseline. */
function headerClass(leading: ReactNode): string {
  if (leading === undefined) {
    return 'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
  }

  return 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
}
