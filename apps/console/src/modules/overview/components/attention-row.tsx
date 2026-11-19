import { Link } from '@tanstack/react-router'
import ArrowRight from '~icons/solar/arrow-right-linear'
import TriangleAlert from '~icons/solar/danger-triangle-linear'
import type { JSX } from 'react'

import type { AttentionItem } from '@/modules/overview/model/attention-items'

const TONE_COLORS: Record<AttentionItem['tone'], string> = {
  destructive: 'text-destructive',
  warning: 'text-amber-700 dark:text-amber-400',
}

/** One problem: what is wrong, why it matters, and the whole row leads to the fix. */
export function AttentionRow({ item }: { item: AttentionItem }): JSX.Element {
  return (
    <Link
      to={item.to}
      className="group hover:bg-accent flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors motion-safe:active:scale-[0.99]"
    >
      <TriangleAlert
        aria-hidden="true"
        className={`mt-0.5 size-5 shrink-0 ${TONE_COLORS[item.tone]}`}
      />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-sm font-semibold">{item.title}</span>
        <span className="text-muted-foreground text-xs text-pretty">{item.detail}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5"
      />
    </Link>
  )
}
