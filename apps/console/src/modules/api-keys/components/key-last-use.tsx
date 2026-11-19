import type { JSX } from 'react'

import { formatDateTime, formatRelative } from '@/shared/lib/format-date'

/** The server stamps a key at most this often, so "last use" can lag by up to this much. */
const RECORDING_DELAY_MINUTES = 5
const NO_USE = 'Sem uso registrado'

type KeyLastUseProps = {
  lastUsedAt: string | null | undefined
  /** In the "Último uso" column the heading says what it is, so only the time shows. */
  isBare?: boolean
}

/**
 * When a request last used the key. Keys not used since recording started have no stamp, which
 * is not the same as never used, so the empty case says "registered". The exact moment is in
 * the hover text, not a focus stop: nothing here is an action.
 */
export function KeyLastUse({ lastUsedAt, isBare }: KeyLastUseProps): JSX.Element {
  if (lastUsedAt === null || lastUsedAt === undefined) {
    return <NoUse isBare={isBare === true} />
  }

  return (
    <time
      dateTime={lastUsedAt}
      title={`${formatDateTime(lastUsedAt)}, com até ${RECORDING_DELAY_MINUTES} min de atraso`}
    >
      {usedText(formatRelative(lastUsedAt), isBare === true)}
    </time>
  )
}

/** A dash in the column, so a page of unused keys is not a wall of the same sentence. */
function NoUse({ isBare }: { isBare: boolean }): JSX.Element {
  if (isBare) {
    return (
      <span title={NO_USE}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{NO_USE}</span>
      </span>
    )
  }

  return <span>{NO_USE.toLowerCase()}</span>
}

function usedText(relative: string, isBare: boolean): string {
  if (isBare) {
    return relative.charAt(0).toUpperCase() + relative.slice(1)
  }

  return `usada ${relative}`
}
