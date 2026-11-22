import type { ReactNode } from 'react'

/** The ids that describe a control: its hint and its error, when shown. */
export function describedBy(id: string, hint: ReactNode, error: ReactNode): string | undefined {
  const ids = [hintId(id, hint), errorId(id, error)].filter((value) => value !== undefined)

  if (ids.length === 0) {
    return undefined
  }

  return ids.join(' ')
}

export function hintId(id: string, hint: ReactNode): string | undefined {
  if (hint === undefined || hint === null || hint === '') {
    return undefined
  }

  return `${id}-hint`
}

export function errorId(id: string, error: ReactNode): string | undefined {
  if (error === undefined || error === null || error === '') {
    return undefined
  }

  return `${id}-error`
}
