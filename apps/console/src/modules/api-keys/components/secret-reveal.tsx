import type { JSX } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

type SecretRevealProps = {
  label: string
  value: string
  /** Puts focus on Copy, the one thing to do with a key shown once. */
  autoFocusCopy?: boolean
}

/** A value to copy as is (a key shown once, a callback URL), never cut off: it wraps instead. */
export function SecretReveal({ label, value, autoFocusCopy }: SecretRevealProps): JSX.Element {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="bg-muted/60 flex items-start gap-2 rounded-lg border p-1.5 pl-3">
        <code className="min-w-0 flex-1 self-center py-1 font-mono text-xs break-all">{value}</code>
        <CopyButton value={value} description={label} autoFocus={autoFocusCopy} />
      </div>
    </div>
  )
}
