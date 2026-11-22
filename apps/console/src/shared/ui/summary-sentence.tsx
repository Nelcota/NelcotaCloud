import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import type { NoticeTone } from '@/shared/ui/notice'

const WORD_COLORS: Record<NoticeTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
}

const GLYPHS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert }

type SummarySentenceProps = {
  tone: NoticeTone
  /** The verdict in one word, drawn in the tone's color ("Saudável."). */
  verdict: string
  /** The plain sentence that explains it, built from the page's own numbers. */
  children: ReactNode
  /** A control at the end of the strip, such as the step that fixes the problem. */
  action?: ReactNode
  className?: string
}

/** One human sentence at the top of a metrics page: the verdict first, then why. */
export function SummarySentence({
  tone,
  verdict,
  children,
  action,
  className,
}: SummarySentenceProps): JSX.Element {
  const Glyph = GLYPHS[tone]

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface px-4 py-3',
        className,
      )}
    >
      <Glyph aria-hidden className={cn('size-4.5 shrink-0', WORD_COLORS[tone])} />
      <p className="max-w-prose min-w-0 flex-1 text-sm text-pretty text-foreground">
        <span className={cn('font-medium', WORD_COLORS[tone])}>{verdict}</span> {children}
      </p>
      {action}
    </div>
  )
}
