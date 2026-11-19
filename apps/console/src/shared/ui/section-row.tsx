import type { JSX, ReactNode } from 'react'
import { useId } from 'react'

type SectionRowProps = {
  /** The section's name; may carry a term beside it (a `code` element). */
  title: ReactNode
  description?: ReactNode
  /** The section's content: a card, a table, an action. */
  children: ReactNode
}

/**
 * One section of a page laid out on a 12-column grid: what it is on the left (4 columns, 3 on
 * very wide pages), its content on the right, both starting on the same top line. Sections are
 * split by a hairline and spaced on an 8px rhythm. The grid follows the width of the page's
 * own container (`@container` on an ancestor), so a narrow page stacks the two parts instead.
 * Stacked, the title sits 24px above its content: more than a card's own 20px padding, so the
 * card still reads as one block with its title.
 */
export function SectionRow({ title, description, children }: SectionRowProps): JSX.Element {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-6 border-t pt-8 first:border-t-0 first:pt-0 @4xl:grid-cols-12 @4xl:gap-x-8"
    >
      <header className="grid content-start gap-2 @4xl:col-span-4 @5xl:col-span-3">
        <h2 id={headingId} className="text-lg text-balance">
          {title}
        </h2>
        <SectionDescription description={description} />
      </header>
      <div className="min-w-0 @4xl:col-span-8 @5xl:col-span-9">{children}</div>
    </section>
  )
}

function SectionDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-muted-foreground text-sm text-pretty">{description}</p>
}
