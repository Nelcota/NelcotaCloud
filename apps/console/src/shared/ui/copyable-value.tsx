import type { JSX } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

type CopyableValueProps = {
  label: string
  value: string
}

/** A value to copy as is (a key shown once, a callback URL), never cut off: it wraps instead. */
export function CopyableValue({ label, value }: CopyableValueProps): JSX.Element {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-start gap-1 rounded-md bg-surface py-0.5 ps-2.5 pe-0.5">
        <code className="min-w-0 flex-1 py-1 font-mono text-xs wrap-anywhere">{value}</code>
        <CopyButton value={value} description={label} isIconOnly />
      </div>
    </div>
  )
}
