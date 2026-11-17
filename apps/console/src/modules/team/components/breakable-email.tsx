import type { JSX } from 'react'
import { Fragment } from 'react'

/** Splits an email so it can wrap before "@" and dots, never in the middle of a word. */
const BREAK_POINTS = /([@.])/

/**
 * An email that stays readable in narrow columns: it wraps at "@" and dots (and only as a last
 * resort anywhere else), so a person is identifiable before any action on them.
 */
export function BreakableEmail({ email }: { email: string }): JSX.Element {
  return (
    <span title={email} className="min-w-0 font-medium [overflow-wrap:anywhere]">
      {email.split(BREAK_POINTS).map((part, index) => (
        <Fragment key={index}>
          <BreakBefore part={part} />
          {part}
        </Fragment>
      ))}
    </span>
  )
}

function BreakBefore({ part }: { part: string }): JSX.Element | null {
  if (BREAK_POINTS.test(part) === false) {
    return null
  }

  return <wbr />
}
