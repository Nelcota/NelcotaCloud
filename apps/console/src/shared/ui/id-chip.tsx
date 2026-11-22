import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import { CopyButton } from '@/shared/ui/copy-button'

type IdChipProps = {
  /** What the value is, for screen readers and the optional visible label ("ID do usuário"). */
  label: string
  value: string
  /** Shows the label before the value, for header bars of facts. */
  isLabelVisible?: boolean
  className?: string
}

/** An id, key or endpoint in mono, cut to fit, with the full value on hover and a copy button. */
export function IdChip({ label, value, isLabelVisible, className }: IdChipProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-[6px] bg-surface ps-2 pe-0.5 text-2xs',
        className,
      )}
    >
      {isLabelVisible === true && <span className="shrink-0 text-muted-foreground">{label}</span>}
      <code title={value} className="min-w-0 truncate font-mono text-foreground">
        {value}
      </code>
      <CopyButton value={value} description={label} isIconOnly />
    </span>
  )
}
