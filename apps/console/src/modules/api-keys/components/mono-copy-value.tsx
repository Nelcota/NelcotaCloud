import type { JSX } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

type MonoCopyValueProps = {
  /** What the value is, for the copy button's accessible name. */
  label: string
  value: string
}

/** A key or an address in mono, cut to fit its cell, with the whole value on hover and a copy button. */
export function MonoCopyValue({ label, value }: MonoCopyValueProps): JSX.Element {
  return (
    <span className="-my-1 flex min-w-0 items-center gap-0.5">
      <code title={value} className="min-w-0 truncate font-mono text-xs text-foreground">
        {value}
      </code>
      <CopyButton value={value} description={label} isIconOnly />
    </span>
  )
}
