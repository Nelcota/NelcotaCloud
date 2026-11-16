import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

/**
 * The NelcotaCloud mark. The logo is white, so it sits on a dark tile that keeps it readable
 * in the light theme too (the same tile as the favicon).
 */
export function LogoMark({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-[#18181b] p-1.5',
        className,
      )}
    >
      <img src="/nelcota-logo.png" alt="" width={256} height={256} className="size-full" />
    </span>
  )
}
