import type { JSX, ReactNode } from 'react'
import { useId } from 'react'

type UserSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

/**
 * One block of the user's page: its title above, then its content at the full width. Blocks are
 * split by a hairline and 32px, so only content that is a real object (a table, a panel) gets a
 * card; lists and forms sit on the page.
 */
export function UserSection({ title, description, children }: UserSectionProps): JSX.Element {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-3 border-t pt-8 first:border-t-0 first:pt-0"
    >
      <header>
        <h2 id={headingId} className="text-base">
          {title}
        </h2>
        <SectionDescription description={description} />
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function SectionDescription({ description }: { description?: string }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-muted-foreground mt-1 text-sm text-pretty">{description}</p>
}
