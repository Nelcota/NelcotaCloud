import type { JSX, ReactNode } from 'react'

type AuthHeadingProps = { title: string; description?: ReactNode }

/** The step's title and what it asks for, at the top of the form column. */
export function AuthHeading({ title, description }: AuthHeadingProps): JSX.Element {
  return (
    <header className="grid gap-1.5">
      <h1 className="text-2xl font-semibold text-balance text-heading">{title}</h1>
      <AuthDescription description={description} />
    </header>
  )
}

function AuthDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-sm text-pretty text-muted-foreground">{description}</p>
}
