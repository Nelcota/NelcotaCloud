import type { JSX } from 'react'

/** One value of a row as text: JSON stringified, null as a muted `NULL`, long values cut. */
export function CellValue({ value }: { value: unknown }): JSX.Element {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">NULL</span>
  }

  const text = cellText(value)

  return (
    <span title={text} className="block max-w-xs truncate">
      {text}
    </span>
  )
}

function cellText(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}
