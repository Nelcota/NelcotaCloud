import type { JSX } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

type SecretValueProps = {
  /** What the value is, for the copy button. */
  label: string
  value: string
}

/** A secret shown once, whole and wrapped in mono, so nothing of it is cut off before copying. */
export function SecretValue({ label, value }: SecretValueProps): JSX.Element {
  return (
    <div className="flex min-w-0 items-start gap-1 rounded-lg bg-surface py-1 ps-3 pe-1">
      <code className="min-w-0 flex-1 py-1 font-mono text-xs text-foreground wrap-anywhere">
        {value}
      </code>
      <CopyButton value={value} description={label} isIconOnly />
    </div>
  )
}
